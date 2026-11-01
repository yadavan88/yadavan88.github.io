---
title: "Building a Generic Data Integration Pipeline in Scala: The Data Plumber - Part 1"
pubDatetime: 2025-03-17T18:09:10.000Z
description: "This blog is a part of the Data Plumber Series."
tags:
  - "scala"
  - "pipeline"
  - "dataintegration"
  - "data-plumber"
ogImage: "/images/posts/building-a-generic-data-integration-pipeline-in-scala-the-data-plumber-part-1/10cc8587-4d1d-48ad-a31d-20e226d25e81.jpeg"
---
# Introduction

> This blog is a part of the [Data Plumber Series](/tags/data-plumber/).

In today's enterprise applications, data integration is not just a feature—it's a fundamental requirement. Applications need to communicate with various systems using different protocols and formats:

* File-based integrations (CSV, JSON, XML)
    
* Database systems (PostgreSQL, MongoDB, Cassandra)
    
* Message queues (Kafka, RabbitMQ)
    
* REST APIs and WebSockets
    
* IoT protocols (MQTT)
    
* Hardware devices with proprietary protocols
    

Each integration point brings its own complexities, patterns, and challenges. When your application needs to handle multiple such integrations, having a standardized approach becomes crucial. Instead of creating custom implementations for each integration, a generic framework can provide:

* Consistent patterns across different integrations
    
* Reusable components
    
* Type-safe data handling
    
* Standardized error handling
    
* Common monitoring and logging interfaces
    

## Disclaimer

> This article presents a proof-of-concept implementation designed to showcase key concepts. In real-world production environments, additional factors—such as proper rollback handling, comprehensive error recovery, distributed transactions, performance tuning, and monitoring—should be carefully considered. Moreover, for single-source/sink integrations, a specialized solution might be more appropriate than a generic framework.

# The Data Plumber Framework

Data Plumber is a type-safe data pipeline framework in Scala that demonstrates how to build a generic integration framework. Here's its high-level architecture:

![](/images/posts/building-a-generic-data-integration-pipeline-in-scala-the-data-plumber-part-1/954cc732-2038-4975-9e45-062270b7b01e.png)

### Core Components

* **Source**: Reads data from the origin system, handles data extraction and manages source-specific configurations
    
* **Transformer**: Converts data between source and sink formats
    
* **Sink**: Writes data to the destination system, handles destination-specific configurations
    
* **DataPlumber**: Combines Source, Transformer, and Sink into a complete pipeline
    

# Framework Variants

The Data Plumber framework comes in three variants, each serving different use cases:

1. ### **Simple Implementation**
    
    * Basic source-to-sink pipeline
        
    * Synchronous processing
        
    * Ideal for quick integrations and prototypes
        
    
2. ### **Offsetable Implementation**
    
    * Support for batch processing
        
    * Progress tracking with Redis
        
    * Resumable operations
        
    * Will be covered in Part 2
        
    
3. ### **Streaming Implementation**
    
    * Built with fs2 streams
        
    * Real-time data processing
        
    * Back-pressure handling
        
    * Will be covered in Part 3
        
    

# Simple DataPlumber

Let’s look at the simple data plumber implementation. The core part consists of the following three traits:

```scala
trait DataPlumber[S, D] {
    def source: DataSource[S]
    def sink: DataSink[D]
    final def run = sink.write(transform(source.read))
    def transform(rows: List[S]): List[D]
}
trait DataSource[S] {
    def read: List[S]
}
trait DataSink[D] {
    def write(rows: List[D]): Unit
}
```

These basic traits can be implemented for various data sources and sinks like CSV files, databases (MongoDB, PostgreSQL), REST APIs, message queues, or any custom protocol. Each implementation only needs to handle its specific read or write logic while following the simple interface defined by DataSource\[S\] or DataSink\[D\]. This approach makes the framework easily extensible while maintaining a consistent pattern for building data pipelines.

# Sample Implementations

Now, let's look at a sample concrete implementation with different sources and sinks. We'll build a data pipeline that reads Star Trek logs from a CSV file and writes them to MongoDB, demonstrating how to implement each component of our framework.

## Domain Models

```scala
enum LogType {
    case CaptainsLog, FirstOfficerLog, ChiefMedicalLog, ChiefEngineerLog, PersonalLog
}
// Source model (from CSV)
case class StarLogEntry(
    starDate: Double,
    logType: LogType,
    crewId: Int,
    entry: String,
    planetaryDate: LocalDate,
    starfleetTime: LocalDateTime
)
// Destination model (for MongoDB)
case class MongoStarLogEntry(
    starDate: Double,
    logType: String,  // Note: Enum converted to String for MongoDB
    crewId: Int,
    entry: String,
    planetaryDate: LocalDate,
    starfleetTime: LocalDateTime
)
```

## CSV Source Implementation

Now, let’s add an implementation for reading from the csv file. Note that, this is a very crude implementation that doesn’t handle all csv variations, but that is not needed for the sample implementation:

```scala
trait CsvSource[T] extends DataSource[T] {
    def location: String
    def read: List[T] = {
        println(s"reading from csv file: $location")
        val source = Source.fromFile(location)
        try {
            val lines = source.getLines().toList
            // Skip header line
            val dataRows = lines.tail
            dataRows.map(fromCSVRow)
        } finally {
            source.close()
        }
    }
    protected def fromCSVRow(row: String): T
}
```

We implement this trait for our Star Trek logs:

```scala
class StarLogSource extends CsvSource[StarLogEntry] {
    override def location: String = "/path/to/starlog.csv"
    
    override protected def fromCSVRow(row: String): StarLogEntry = {
        row.split(",").map(_.trim) match {
            case Array(starDate, logType, crewId, entry, planetaryDate, starfleetTime) =>
                StarLogEntry(
                    starDate.toDouble,
                    LogType.valueOf(logType),
                    crewId.toInt,
                    entry,
                    LocalDate.parse(planetaryDate),
                    LocalDateTime.parse(starfleetTime)
                )
            case _ => 
                throw new IllegalArgumentException(s"Invalid CSV row format: $row")
        }
    }
}
```

## Sink Implementation

Similarly, the we can first implement MongoSink trait for MongoDB operations:

```scala
trait MongoSink[T] extends DataSink[T] {
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

    def write(rows: List[T]): Unit = {
        val documents = rows.map(toDocument)
        collection.insertMany(documents.asJava)
    }
    protected def toDocument(value: T): Document
}
```

Now, we can use this trait to implement the concrete sink for Mongo:

```scala
class StarLogSink extends MongoSink[MongoStarLogEntry] {
    override def collectionName: String = "starlog"
    override def mongoUri: String = "mongodb://localhost:27017/starlog"
    
    override def toDocument(value: MongoStarLogEntry): Document = {
        val doc = new Document()
        doc.put("starDate", value.starDate)
        doc.put("logType", value.logType)
        doc.put("crewId", value.crewId)
        doc.put("entry", value.entry)
        doc.put("planetaryDate", value.planetaryDate)
        doc.put("starfleetTime", value.starfleetTime)
        doc
    }
}
```

## The Complete Pipeline

Finally, we implement the DataPlumber trait to tie everything together:

```scala
class StarLogIntegrator extends DataPlumber[StarLogEntry, MongoStarLogEntry] {
    override def source: CsvSource[StarLogEntry] = new StarLogSource()
    override def sink: MongoSink[MongoStarLogEntry] = new StarLogSink()
    
    override def transform(list: List[StarLogEntry]): List[MongoStarLogEntry] = {
        list.map(value => MongoStarLogEntry(
            value.starDate,
            value.logType.toString,
            value.crewId,
            value.entry,
            value.planetaryDate,
            value.starfleetTime
        ))
    }
}
```

## Running the Pipeline

To execute our pipeline:

```scala
@main
def start = {
    val integrator = new StarLogIntegrator()
    integrator.run
}
```

This example demonstrates how the framework's traits provide the basic infrastructure while allowing us to focus on the specific implementation details for our use case. The framework handles the common patterns (file reading, MongoDB connection management, etc.) while we implement the data-specific logic (CSV parsing, document mapping, etc.).

The databases required for this application is available as [docker-compose](https://github.com/yadavan88/data-plumber/blob/main/docker-compose.yml) file. Make sure to run it before starting the application.

# Conclusion

In this first part, we explored the basic implementation of the Data Plumber framework, demonstrating how to build type-safe data pipelines in Scala. The simple implementation showcases the core principles of the framework: separation of concerns through distinct *Source* and *Sink* components, type safety through generics, and easy extensibility through traits. While this implementation is straightforward, using minimal dependencies and synchronous processing, it serves as a solid foundation for understanding data pipeline patterns.

The entire DataPlumber implementation is available on [GitHub](https://github.com/yadavan88/data-plumber).

However, this simple implementation has its limitations - it loads all data into memory, lacks error recovery mechanisms, and doesn't support progress tracking. In the next parts of this series, we'll address these limitations by:

* [**Part 2**](/posts/building-a-generic-data-integration-pipeline-in-scala-the-data-plumber-part-2/): Adding offset-based processing and batch handling
    
* [**Part 3**](/posts/building-a-generic-data-integration-pipeline-in-scala-the-data-plumber-part-3/): Implementing streaming capabilities using fs2 for real-time data processing
    

These enhancements will make the framework more suitable for production use cases while maintaining the same clean and type-safe design principles we've established here.
