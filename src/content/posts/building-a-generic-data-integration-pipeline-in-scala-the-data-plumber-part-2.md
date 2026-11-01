---
title: "Building a Generic Data Integration Pipeline in Scala: The Data Plumber - Part 2"
pubDatetime: 2025-03-17T19:09:17.000Z
description: "This blog is a part of the ***Data Plumber Series******.***"
tags:
  - "scala"
  - "dataintegration"
  - "data-plumber"
ogImage: "/images/posts/building-a-generic-data-integration-pipeline-in-scala-the-data-plumber-part-2/c4f338ad-fa95-47aa-ba75-d6db3afa87a7.jpeg"
---
# Introduction

In [Part 1](/posts/building-a-generic-data-integration-pipeline-in-scala-the-data-plumber-part-1/), we explored the basic implementation of our data pipeline framework, demonstrating the core concepts of type-safe data transformation between sources and sinks. While the simple implementation was great for understanding the basics, real-world applications need more robust features.

In this part, we'll enhance our framework with several more features:

1. **Effect Management**: Using cats-effect's IO for better control over side effects
    
2. **Batch Processing**: Support for processing data in configurable batches
    
3. **Error Handling**: Customizable error handling hooks for better error recovery
    
4. **Offset Management**: Using Redis to track progress and support restart capabilities
    

# Offsetable Data Plumber

The structure of the code looks very similar to the previous implementation, with a few additions.

### Offset Registry

One of the key additions in this version is the ability to track and resume processing through offsets. For this, we need a registry to persistently store and retrieve offset information. In our implementation, we use Redis as the offset registry, but this could be replaced with any persistent store.

### Offset Components

The offset tracking mechanism is built around three key concepts:

* **Offsetable**: A trait that marks entities which can be processed in batches with a unique identifier (id). This is typically used for database entities where we can track progress using primary keys or similar sequential identifiers.
    
* **Offset**: Represents a checkpoint in our processing, containing both the last processed position (lastOffset) and when it was processed (dateTime). This information allows us to resume processing from where we left off.
    
* **ReadResult**: Wraps the actual data (rows) along with information about where to continue in the next batch (nextOffset), enabling continuous batch processing.
    

Key differences from the simple implementation:

1. Methods return cats effect IO instead of direct values
    
2. *Source* and *Sink* operations include offset information
    
3. *ReadResult* wraps the actual data with offset information
    
4. Additional configuration for offset storage and batch processing
    

### Framework Structure

Now, let’s look at the framework structure with these components:

```scala
trait OffsetableDataPlumber[S, D] {
  def source: DataSource[S]
  def sink: DataSink[D]
  def name: String
  def redisHost: String
  lazy val redisClient = new RedisClient(redisHost, name)
  private val OFFSET_KEY = "offset"
  private val OFFSET_DT = "offset-dt"
  final def run = {
    (for {
      offsetValue <- redisClient.get(OFFSET_KEY)
      offsetDT <- redisClient.get(OFFSET_DT)
      offset = offsetValue.flatMap(off => offsetDT.map(Offset(off, _)))
      readResult <- source.read(offset)
      transformed = transform(readResult)
      _ <- sink.write(transformed, offset)
      _ <- setNewOffset(readResult.nextOffset)
      _ <- IO.println(s"**** Successfully processed ${readResult.rows.size} rows ****")
    } yield readResult.rows.size).recoverWith {
      case NonFatal(error) =>
        IO.println(s"Error occurred while running DataPlumber: $error. Performing error handling hook") >>
          handleError(error).map(_ => -1)
    }
  }

  private def setNewOffset(offset: Option[Offset]) = {
    offset.map { off =>
      for {
        _ <- redisClient.set(OFFSET_KEY, off.lastOffset)
        _ <- redisClient.set(OFFSET_DT, off.dateTime.toString)
      } yield ()
    }.traverse(identity)
  }
  def transform(readResult: ReadResult[S]): List[D]
  def handleError(error: Throwable): IO[Unit]
}

trait DataSource[S] {
  def read(offset: Option[Offset]): IO[ReadResult[S]]
}

trait DataSink[D] {
  def write(rows: List[D], lastOffset: Option[Offset]): IO[Unit]
}
```

As we can see the structure is almost identical to the simple data plumber implementation with changes to support offset handling.

## Source Implementation

Let’s look at a sample Source implementation to read from Mongo Database. This particular example uses java mongo driver, but you can rewrite in any libraries:

```scala
trait OffsetableMongoSource[T] extends DataSource[T] {
  def collectionName: String
  def mongoUri: String
  def batchSize: Int = 100
  private val connectionString = new ConnectionString(mongoUri)
  private val settings = MongoClientSettings
    .builder()
    .applyConnectionString(connectionString)
    .applyToSocketSettings(builder =>
      builder.connectTimeout(5.seconds.toMillis.toInt, TimeUnit.MILLISECONDS)
    )
    .build()
  private val mongoClient = MongoClients.create(settings)
  private val database = mongoClient.getDatabase(connectionString.getDatabase)
  private val collection = database.getCollection(collectionName)
  def read(offset: Option[Offset]): IO[ReadResult[T]] = {
    IO {
      println(s"Offset in MongoSource: ${offset}")
      
      val filter = offset
        .map { off =>
          Document.parse(
            s"""{ "_id": { "$$gt": ObjectId("${off.lastOffset}") } }"""
          )
        }
        .getOrElse(new Document())

      val res = collection
        .find(filter)
        .sort(Sorts.ascending("_id"))
        .limit(batchSize)
        .iterator()
        .asScala
        .toList

      val nextOffset = res.lastOption.map(doc => Offset(doc.get("_id").toString, LocalDateTime.now().toString))
      ReadResult(res.map(doc => fromDocument(doc)), nextOffset)
    }
  }
  protected def fromDocument(doc: Document): T
}
```

In this source, we utilized the offset value to build the find query to read from the database. We also calculate the next offset value based on the data we read and pass it on to the data plumber.

Similarly, we can implement other sources like [PostgresSource](https://github.com/yadavan88/data-plumber/blob/main/src/main/scala/com/yadavan88/dataplumber/offsetable/source/OffsetablePostgresSource.scala) or [CsvSource](https://github.com/yadavan88/data-plumber/blob/main/src/main/scala/com/yadavan88/dataplumber/offsetable/source/OffsetableCsvSource.scala) or anything else.

### Sink Implementation

Next, let’s implement a sink. For example, we can build a sink for Postgres:

```scala
trait OffsetablePostgresSink[T: Write] extends DataSink[T] {
  def tableName: String
  def connectionString: String

  private val xa = Transactor.fromDriverManager[IO](
    "org.postgresql.Driver",
    connectionString,
    "",
    "",
    None
  )

  def write(rows: List[T], readOffset: Option[Offset]): IO[Unit] = {
    if (rows.isEmpty) {
      IO.pure(None)
    } else {
      val valuesFragments = rows.map { row =>
        fr"(" ++ fr"$row" ++ fr")"
      }.reduce(_ ++ fr"," ++ _)

      val query =
        fr"INSERT INTO " ++ Fragment.const(tableName) ++ fr" VALUES " ++ valuesFragments
      query.update.run
      .transact(xa).void
    }
  }
}
```

This write multiple rows to postgres using the doobie. You can use other libraries like [Magnum](https://github.com/yadavan88/data-plumber/blob/main/src/main/scala/com/yadavan88/dataplumber/offsetable/sink/OffsetablePostgresSinkMagnum.scala) if that makes sense.

Similarly, we can implement Sink for other integrations as well, such as [MongoSink](https://github.com/yadavan88/data-plumber/blob/main/src/main/scala/com/yadavan88/dataplumber/offsetable/sink/OffsetableMongoSink.scala), [CsvSink](https://github.com/yadavan88/data-plumber/blob/main/src/main/scala/com/yadavan88/dataplumber/offsetable/sink/OffsetableCSVSink.scala) and so on.

# Concrete Implementation

Now that the source and sink implementations are ready, let’s tie them up together and integrate. We’ll use the same StarLog models for this example as well.

Let’s implement the Source for our StarLog data:

```scala
class StarLogOffsetableMongoSource extends OffsetableMongoSource[MongoStarLogEntry] {
  override def batchSize: Int = 2

  override protected def fromDocument(doc: Document): MongoStarLogEntry = MongoStarLogEntry(
    doc.getDouble("starDate"),
    doc.getString("logType"),
    doc.getInteger("crewId"),
    doc.getString("entry"),
    doc.getDate("planetaryDate").toInstant.atZone(ZoneOffset.UTC).toLocalDate,
    doc.getDate("starfleetTime").toInstant.atZone(ZoneOffset.UTC).toLocalDateTime
  )

  override def mongoUri: String = "mongodb://mongoadmin:mongopassword@localhost:27027/starlog?authMechanism=SCRAM-SHA-256&authSource=admin"  
  override def collectionName: String = "starlog-offsetable"
}
```

Next, let’s add implement Postgres Sink for writing the StarLog:

```scala
class StarLogOffsetablePostgresSink(using Write[StarLogEntry]) extends OffsetablePostgresSink[StarLogEntry] {
  override def connectionString: String = "jdbc:postgresql://localhost:5432/data-plumber?user=postgres&password=admin"
  override def tableName: String = "starlog_offsetable"
}
```

Finally, let’s create the DataPlumber that reads from Mongo and writes to Postgres:

```scala
class OffsetableMongoToPostgresDataPlumber extends OffsetableDataPlumber[MongoStarLogEntry, StarLogEntry] {

  import StarLogOffsetablePostgresSinkWriter.given
  override lazy val source: DataSource[MongoStarLogEntry] = new StarLogOffsetableMongoSource
  override lazy val sink: DataSink[StarLogEntry] = new StarLogOffsetablePostgresSink
  override lazy val name: String = "mongo-to-postgres-plumber"
  override lazy val redisHost: String = "redis://localhost:6379"
  override def transform(readResult: ReadResult[MongoStarLogEntry]): List[StarLogEntry] = {
    readResult.rows.map(value =>
      StarLogEntry(
        value.starDate,
        LogType.valueOf(value.logType),
        value.crewId,
        value.entry,
        value.planetaryDate,
        value.starfleetTime
      )
    )
  }
  override def handleError(error: Throwable): IO[Unit] = {
    error.printStackTrace()
    IO.println(s"Error from offsetable plumber: $error")
  }
}
```

We provided the required details for the data plumber with source, sink and other configurations.

Now, we can create a main class to run this data plumber:

```scala
@main
def startOffsetablePlumber = {
  val mongoToPG = new OffsetableMongoToPostgresDataPlumber()
  def processForever: IO[Unit] = for {
    count <- mongoToPG.run
    _ <- IO.println(s"Processed $count records")
    _ <- if (count == 0) IO.sleep(5.seconds) else IO.unit
    _ <- processForever
  } yield ()
  processForever.unsafeRunSync()
}
```

This continuously runs and sync data from MongoDB to Postgres.

The databases required for this application is available as [docker-compose](https://github.com/yadavan88/data-plumber/blob/main/docker-compose.yml) file. Make sure to run it before starting the application.

# Conclusion

The Offsetable Data Plumber provides a robust foundation for batch data processing with built-in offset tracking using Redis. While it effectively handles data transformation between different sources and sinks with type safety and error handling, it's important to note that it doesn't handle distributed transactions or concurrent processing.

For scenarios requiring real-time processing or streaming capabilities, we'll explore the Streaming Data Plumber implementation in Part 3, which builds upon these concepts to provide continuous data flow with backpressure handling and lower latency.

The implementation used in this part is available over on [GitHub](https://github.com/yadavan88/data-plumber/tree/main/src/main/scala/com/yadavan88/dataplumber/offsetable).
