---
title: "Building a Generic Data Integration Pipeline in Scala: The Data Plumber - Part 3"
pubDatetime: 2025-03-18T05:35:14.000Z
description: "This blog is a part of the ***Data Plumber Series.***"
tags:
  - "scala"
  - "dataintegration"
  - "data-plumber"
ogImage: "/images/posts/building-a-generic-data-integration-pipeline-in-scala-the-data-plumber-part-3/087c4a7c-5b51-47df-a713-838f3ef8457b.jpeg"
---
# Introduction

> ***This blog is a part of the*** [***Data Plumber Series.***](/tags/data-plumber/)

In [Parts 1](/posts/building-a-generic-data-integration-pipeline-in-scala-the-data-plumber-part-1/) and [Part 2](/posts/building-a-generic-data-integration-pipeline-in-scala-the-data-plumber-part-2/), we explored simple and batch-oriented data pipelines. Now, let's dive into continuous streaming data processing using FS2.

# Streaming Data Plumber

The streaming implementation builds on our previous patterns but uses FS2's Stream for continuous data processing.

Let’s directly look at the DataPlumber framework for the streaming operations:

```scala
trait StreamingDataPlumber[S, D] {
    def source: StreamingDataSource[S]
    def sink: StreamingDataSink[D]
    def name: String
    def redisHost: String
    def batchSize: Int
    def batchTimeout: FiniteDuration = 5.seconds
    def pollInterval: FiniteDuration = 5.seconds

    private lazy val redisClient = new RedisClient(redisHost, name)
    private val OFFSET_KEY = "offset"

    final def run: IO[Unit] = {
        Stream.fixedRate[IO](pollInterval)
          .evalMap(_ => redisClient.get(OFFSET_KEY))
          .flatMap { lastOffset =>
            val offset = lastOffset.map(off => Offset(off, java.time.LocalDateTime.now.toString))
            source.read(offset)
          }
          .groupWithin(batchSize, batchTimeout)
          .through(transform)
          .through(sink.write)
          .evalMap { chunk => 
              Option(chunk.last).flatten match {
                case Some(lastRecord: Offsetable) => redisClient.set(OFFSET_KEY, lastRecord.id.toString)
                case _ => IO.unit
              }
          }
          .handleErrorWith { error =>
              Stream.eval(
                  IO.println(s"Error occurred while running DataPlumber: $error. Performing error handling hook") >>
                  handleError(error)
              ) >> Stream.empty
          }
          .compile
          .drain
    }

    def transform: Pipe[IO, Chunk[S], Chunk[D]]
    def handleError(error: Throwable): IO[Unit]
}

trait StreamingDataSource[S] {
    def read(offset: Option[Offset]): Stream[IO, S]
}

trait StreamingDataSink[D] {
    def write: Pipe[IO, Chunk[D], Chunk[D]]
}
```

This is similar to the previous implementation. Instead of IO, the read and write functions returns FS2’s *Stream* type.

# Source Implementation

Let’s add an implementation for the Source using streaming. We’ll use Postgres database as the Source:

```scala
trait StreamingPostgresSource[T <: Offsetable: Read] extends StreamingDataSource[T] {
  def tableName: String
  def connectionString: String
  private val xa = Transactor.fromDriverManager[IO](
    "org.postgresql.Driver",
    connectionString,
    "username",
    "password",
    None
  )

  def read(lastOffset: Option[Offset]): Stream[IO, T] = {
    val offsetFilter = lastOffset
      .map { offset =>
        fr" WHERE id > CAST(" ++ Fragment.const(offset.lastOffset) ++ fr" AS BIGINT)"
      }
      .getOrElse(Fragment.empty)
    val query = fr"SELECT * FROM" ++ Fragment.const(tableName) ++ offsetFilter ++ fr" ORDER BY id"
    query
      .query[T]
      .stream
      .transact(xa)
  }
}
```

This reads the data from Postgres database based on the offset value we get from the Redis, similar to our Offsetable implementation. Here, I am using Doobie for the database queries, but you can implement using other libraries.

# Sink Implementation

Next, let’s implement a Mongo Sink to write the data to:

```scala
trait StreamingMongoSink[T] extends StreamingDataSink[T] {
  def collectionName: String
  def mongoUri: String

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

  def write: Pipe[IO, Chunk[T], Chunk[T]] = { stream =>
    stream.evalMap { chunk =>
      println(s"Writing ${chunk.size} documents to MongoDB")
      if (chunk.isEmpty) {
        IO.pure(Chunk.empty)
      } else {
        val documents = chunk.toList.map(toDocument)
        IO(collection.insertMany(documents.asJava))
          .map(_ => chunk)
      }
    }
  }
  protected def toDocument(value: T): Document
}
```

Here we use the official mongo driver for Java to write the documents to Mongo.

# Concrete Implementation

Now that source and sink implementations are ready, let’s write the concrete classes for our StarLog entry:

## Source

Here is the implementation for Source:

```scala
class StarLogPostgresSource(using Read[PGStarLogEntry]) extends StreamingPostgresSource[PGStarLogEntry] {
  override def tableName: String = "starlog_streaming"
  override def connectionString: String = "jdbc:postgresql://localhost:5432/data-plumber?user=postgres&password=admin"
}
```

### Sink

Next, let’s add the Sink implementation for StarLog:

```scala
class StarLogMongoSink extends StreamingMongoSink[PGStarLogEntry] {
  override protected def toDocument(value: PGStarLogEntry): Document = {
    Document.parse(s"""{
      "id": ${value.id},
      "star_date": ${value.starDate},
      "log_type": "${value.logType}",
      "crew_id": ${value.crewId},
      "entry": "${value.entry}",
      "planetary_date": "${value.planetaryDate}",
      "starfleet_time": "${value.starfleetTime}"
    }""")
  }
  override lazy val collectionName: String = "starlog_streaming"
  override lazy val mongoUri: String = "mongodb://mongoadmin:mongopassword@localhost:27027/starlog?authMechanism=SCRAM-SHA-256&authSource=admin"  
}
```

### Data Plumber Implementation

Let’s tie up source to sink:

```scala
class PostgresToMongoStarLogDataPlumber extends StreamingDataPlumber[PGStarLogEntry, PGStarLogEntry] {
  import StarLogStreamingPostgresMongoReaderWriter.given
  override val source: StreamingPostgresSource[PGStarLogEntry] = new StarLogPostgresSource()
  override val sink: StreamingMongoSink[PGStarLogEntry] = new StarLogMongoSink()
  override val name: String = "pg-to-mongo-streamingstarlog"
  override val redisHost: String = "redis://localhost:6379"
  override val batchSize: Int = 30
  override val batchTimeout: FiniteDuration = 10.seconds
  override def handleError(error: Throwable): IO[Unit] = IO.unit
  override def transform: Pipe[IO, Chunk[PGStarLogEntry], Chunk[PGStarLogEntry]] = _.map(chunk => chunk)
}
```

### Running the App

Let’s create the main application to run this data plumber application:

```scala
object StreamingDataPlumberApp extends IOApp.Simple {
  val pgToMongo = new PostgresToMongoStarLogDataPlumber()
  def run: IO[Unit] = 
    IO.println("Starting streaming data plumber.") >> pgToMongo.run
}
```

When we run this application, this continuously reads from the Postgres and write to MongoDB.

The databases required for this application is available as [docker-compose](https://github.com/yadavan88/data-plumber/blob/main/docker-compose.yml) file. Make sure to run it before starting the application.

# Conclusion

Throughout this series, we've explored three different approaches to building data pipelines in Scala, each adding more sophistication and capabilities:

In Part 1, we started with a simple synchronous implementation that demonstrated the basic concepts of type-safe data transformation between sources and sinks. This provided a foundation for understanding the core patterns but lacked features needed for production use.

Part 2 introduced the Offsetable Data Plumber, adding crucial features like offset tracking with Redis and batch processing. This implementation provided better reliability and resumability, making it suitable for batch-oriented data processing where progress tracking is essential.

Finally, in Part 3, we evolved to the Streaming Data Plumber using FS2, which offers continuous data processing with built-in backpressure and efficient resource utilization. This approach combines the benefits of offset tracking from Part 2 with the advantages of streaming: lower latency, better resource management, and natural handling of continuous data flows.

Each implementation serves different use cases:

* Simple Data Plumber for one-off data transfers
    
* Offsetable Data Plumber for reliable batch processing
    
* Streaming Data Plumber for real-time, continuous data flows
    

While this framework provides a foundation for data integration, production implementations would need to consider additional aspects like distributed transactions, comprehensive error recovery, and monitoring. The modular design makes it easy to extend and adapt the framework for specific requirements while maintaining type safety and clean separation of concerns.

This can be further extended by introducing additional options, such as placing Kafka in between, where the source publishes to Kafka and the sink consumes from it. This approach helps decouple the source and sink if that makes sense for the use case.

Here is the [link to the GitHub repository](https://github.com/yadavan88/data-plumber) that contains the code used in all three parts. The specific code we used in this part is available [here](https://github.com/yadavan88/data-plumber/tree/main/src/main/scala/com/yadavan88/dataplumber/streaming) and [here](https://github.com/yadavan88/data-plumber/tree/main/src/main/scala/examples/streaming).
