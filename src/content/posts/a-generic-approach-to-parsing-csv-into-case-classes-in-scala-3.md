---
title: "A Generic Approach to Parsing CSV into Case Classes in Scala 3"
pubDatetime: 2025-02-27T11:51:43.000Z
description: "CSV is one of the most common formats for exchanging and importing data between different systems."
tags:
  - "scala"
  - "csv"
ogImage: "/images/posts/a-generic-approach-to-parsing-csv-into-case-classes-in-scala-3/313d5fb0-2cb2-4ee8-b8c3-e9b2ea60a56e.png"
---
CSV is one of the most common formats for exchanging and importing data between different systems.

While working on a Scala 3 project, I needed a way to read CSV files and convert them into case classes generically—without manually setting values for each field. However, I couldn't find a library that provided this functionality in a fully generic manner. Around the same time, I started watching the Scala Macros course by Rock the JVM, which gave me an idea: why not use Scala 3 Mirrors to parse CSV data generically into case classes?

## The Problem Statement

I needed to:

* Read CSV files from various sources like S3 and local file systems.
    
* Convert the data into different case classes dynamically.
    
* Create a generic solution that allows easy integration of new data sources in the future.
    

Thus, I decided to leverage Scala 3 Mirrors to accomplish this.

## Step 1: Reading a CSV File

The first step was to read a CSV file into a structured format. Since I knew that none of my CSV columns contained commas within values, a simple `split` operation was more than enough:

```scala
def readCsvFile(filePath: String): Seq[Seq[String]] = {
    scala.util.Using(Source.fromFile(filePath)) { source =>
      source.getLines().map(_.split(",").toSeq).toSeq
    }.get //just a temp way 
}
```

This function reads the CSV file and returns a sequence of sequences, where each inner sequence represents a row.

## Step 2: Creating a Type Class for Parsing Values

Next, I needed a way to convert string values from the CSV into appropriate case class field types. I created a `CsvParser` type class for this purpose:

```scala
trait CsvParser[T]:
  def parse(value: String): T

object CsvParser:
  given CsvParser[String] with
    def parse(value: String): String = value.trim

  given CsvParser[Int] with
    def parse(value: String): Int = value.trim.toInt

  given CsvParser[LocalDate] with
    def parse(value: String): LocalDate =
      LocalDate.parse(value.trim, DateTimeFormatter.ISO_DATE)  

  given optionCsvParser[T](using parser: CsvParser[T]): CsvParser[Option[T]] with
    def parse(value: String): Option[T] =
      val trimmed = value.trim
      if trimmed.isEmpty then None else Some(parser.parse(trimmed))
```

Here we defined a trait `CsvParser` with a function parse that takes the string and convert to the generic type T. Then we added given instances for each of the supported types. In this case, we have instances for `String`, `Int`, `Localdate`. Similarly, we can add for other types such as `Double`, `Long`, `LocalDateTime` and so on. We should also support `Option[_]` of these fields. So we can add a parser for `Option[T]` where we use `None` if the field is empty.

You can even use the shorter format of defining the givens if you prefer that:

```scala
trait CsvParser[T]:
  def parse(value: String): T
object CsvParser:
  given CsvParser[String] = _.trim
  given CsvParser[Int] = _.trim.toInt
  given CsvParser[LocalDate] = value => LocalDate.parse(value.trim, DateTimeFormatter.ISO_DATE)
  ...
  ...
  ...
```

## Step 3: Using Mirrors to Extract Case Class Field Types

To convert the CSV row into a case class, we first need to identify the field types and use the corresponding parsers. This is where it gets interesting—we can use the Mirror API in Scala 3 to retrieve the fields and their types at compile time.

Using the Mirror API (`m.MirroredElemTypes`), we can extract all the field types as a tuple. Let’s define a function to create parsers for each field type:

```scala
inline def summonParsers[T <: Tuple]: List[CsvParser[?]] =
    inline erasedValue[T] match
      case _: (t *: ts)  => summonInline[CsvParser[t]] :: summonParsers[ts]
      case _: EmptyTuple => Nil
```

The `summonParsers` function is an inline function that processes the tuple of case class field types.

* We use `erasedValue` from `scala.compiletime`, which allows us to match types at compile time.
    
* The pattern `_: (t *: ts)` matches the tuple fields, where `t` is the first element and `ts` represents the remaining elements.
    
* We use `summonInline` to retrieve the appropriate `CsvParser` instance for `t`.
    
* The function is called recursively for each field until we reach `EmptyTuple`, at which point we return an empty list.
    

This function ultimately provides a `List` of parsers for the case class fields.

## Step 4: Parsing a CSV Row into a Case Class

Once we have the parsers, we can now map them to the corresponding CSV values. We invoke `summonParsers` to get the parsers, then use `zip()` to pair them with the CSV row values. Each value is parsed using the `CsvParser` instance.

```scala
inline def fromCsvRow[A](row: List[String])(using m: Mirror.ProductOf[A]): Either[String, A] = {
    Try {
      val parsers = summonParsers[m.MirroredElemTypes]
      require(
        row.length == parsers.length,
        s"Number of columns in CSV (${row.length}) does not match the number of fields in case class (${parsers.length})"
      )
      val tuple = tupleFromCsv[m.MirroredElemTypes](row, parsers)
      m.fromProduct(tuple)
    }.toEither.left.map(_.getMessage)
}

inline def tupleFromCsv[T <: Tuple](values: List[String], parsers: List[CsvParser[?]]): T =
    values.zip(parsers).map { case (v, parser) =>
      parser.asInstanceOf[CsvParser[Any]].parse(v)
    } match {
      case list => Tuple.fromArray(list.toArray).asInstanceOf[T]
    }
```

I believe `asInstance[]` is safe in this case, but please let me know if there is a better way.

## Step 5: Putting Everything Together

Now let’s connect all together and create `GenericCsvParser`:

```scala
inline def read(file: File)(using m: Mirror.ProductOf[T]): Either[String, List[T]] = {
    CSVTextParser.parseCsv(file) match {
      case Right(rows) =>
        val header = rows.head
        println(s"Header: ${header.mkString(", ")}")
        val dataRows = rows.tail

        val parsedRows = dataRows.zipWithIndex
          .foldLeft[Either[String, List[T]]](Right(List.empty)) { case (acc, (row, index)) =>
            for {
              list <- acc
              obj <- fromCsvRow[T](row).left.map(err => s"Row ${index + 1}: $err")
            } yield obj :: list
          }
          .map(_.reverse)

        parsedRows
      case Left(err) => Left(s"CSV Parsing Error: $err")
    }
  }
```

The `read` function is an inline function that processes a CSV file. To ensure that only case classes are allowed, we restrict the type using `Mirror.ProductOf[T]`. The function then utilizes `CSVTextParser.parseCsv(file)` to read the file and return its contents as a `Seq[Seq[String]]`.

This entire generic csv parsing is implemented in a class `GenericCsvParser`

```scala
class GenericCsvParser[T <: Product] {
  inline def read(file: File)(using m: Mirror.ProductOf[T]): Either[String, List[T]] = ...
  inline def tupleFromCsv[T <: Tuple](values: List[String], parsers: List[CsvParser[?]]): T = ...
  inline def fromCsvRow[A](row: List[String])(using m: Mirror.ProductOf[A]): Either[String, A] = ...
  inline def summonParsers[T <: Tuple]: List[CsvParser[?]] = ...
}
```

## Step 6: Testing the CSV Parser

Now we can create a function to test this:

```scala
case class Employee(name: String, empId: Long, dob: LocalDate)
@main
def main = {
    val parser = GenericCsvParser[Employee]
    val csvData: Either[String, List[Employee]] = parser.read(new File("employee.csv"))
}
```

That’s it, this reads the csv to case class.

## Step 7: Extending Parser

Now, what to do if we have a different type which is not yet supported in our previous implementation?

We can simply create given instance for them and use it during parsing. For example, let’s create a new case class:

```scala
enum LogType:
    case CaptainsLog, FirstOfficerLog, ChiefMedicalOfficerLog, PersonalLog

case class StarLogs(starDate: Double, logType: LogType, crewId: Int, crewName: String, log: String, starfleetDateTime: LocalDateTime, earthDate: LocalDate)

object StarLogs {
    given CsvParser[LogType] with
        def parse(value: String): LogType = LogType.valueOf(value)
}
```

Here we have a field of type `Enum`, which is not supported directly in our csv parser. All we need to do is to create an instance for `CsvParser[LogType]` and provide a way to parse the string to enum.

Then we can use it as:

```scala
@main
def main = {
    import StarLogs.given
    val parser = GenericCsvParser[StarLogs]
    val csvData = parser.read(new File("starlog.csv"))
}
```

Please note the import `StarLogs.given` that imports the new given instance for LogType.

Initially, we used string split with a comma, but we can improve it by using another library like [scala-csv](https://github.com/tototoshi/scala-csv), which can read the fields in a better way, even handling commas in CSV:

```scala
import com.github.tototoshi.csv.CSVReader
import java.io.File
import scala.util.Using
object CSVTextParser {
  def parseCsv(file: File): Either[String, List[List[String]]] = {
    Using(CSVReader.open(file)) { reader =>
      reader.all()
    }.toEither.left.map(_.getMessage)
  }
}
```

That’s it. The full code base is available [here in GitHub](https://github.com/yadavan88/generic-csv-parser/). Please let me know your feedback and suggestions.
