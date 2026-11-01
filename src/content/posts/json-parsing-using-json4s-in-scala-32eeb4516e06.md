---
title: "Json parsing using Json4s in Scala"
pubDatetime: 2020-07-01T20:07:20.000Z
description: "Learn how to use Json4s, a widely-used JSON parsing library in Scala that can work with various existing json libraries including Jackson and Play-Json. Discover how to optimize Json4s with..."
tags:
  - "scala-basics"
---
> Learn how to use Json4s, a widely-used JSON parsing library in Scala that can work with various existing json libraries including Jackson and Play-Json. Discover how to optimize Json4s with Jackson as the foundation, develop custom serializers for intricate data types, and append fields that do not belong to a case class body.

***Json4s*** is one of the most popular JSON parsing libraries in Scala. Json4s support the usage of multiple existing json libraries, like Jackson, Play-Json etc. In this short article, I want to show how we can implement JSON parsing, with custom serializers. I will be json4s with Jackson as the base.

To use Json4s, we need to add the below statement to build.sbt:

`"org.json4s" %% "json4s-jackson" % "3.6.9"`

Now, let’s see how we can write the methods for converting *from* and *to* json.

```scala
import org.json4s.jackson.Serialization._
import org.json4s._

trait JsonParser {
  implicit lazy val serializationFormats: Formats = DefaultFormats
  def fromJson[T](json: String)(implicit mf: Manifest[T]) = {
    read[T](json)
  }
  def toJson(obj: AnyRef): String = {
    write(obj)
  }
}
```

With the above code, now we can convert a case class to JSON String and vice versa. But if the case class has a non-primitive field, say *LocalDate* then the above code will fail. In such case, we need to provide a custom serializer to the ***Formats***.

`implicit lazy val serializationFormats: Formats = new DefaultFormats {} ++ customSerializers`

where, ***customSerializers*** can be implemented as below:

```scala
object CustomSerializers {

private val dateFormatter = DateTimeFormatter.ofPattern("dd-MM-yyyy")
private val dateTimeFormatter = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss")

case object LocalDateSerializer extends CustomSerializer[LocalDate](format => ( {
  case JString(date) => LocalDate.parse(date, dateFormatter)
  case JNull => null
}, {
  case date: LocalDate => JString(date.format(dateFormatter))
}))

case object LocalDateTimeSerializer extends CustomSerializer[LocalDateTime](format => ( {
  case JString(dt) => LocalDateTime.parse(dt, dateTimeFormatter)
  case JNull => null
}, {
  case dt: LocalDateTime => JString(dt.format(dateTimeFormatter))
}))
}
```

This above serializers will allow the serialization/deserialization of *java.time.LocalDate* and *java.time.LocalDateTime* fields.

Similarly, custom serializers can be created for case objects as well. For e.g: If there is an *Enum* implementation using *sealed trait*, and it is required to be serialized/deserialized to json format, then a *CustomSerializer* can be added for it, as shown below:

```scala
case object PeriodSerializer extends CustomSerializer[Period](format => ( {
case JString(dt) => {
dt match {
  case "Day" => Period.Day
  case "Week" => Period.Week
  case "Month" => Period.Month
}
}
  case JNull => null
}, {
  case p: Period => JString(p.name)
}))
```

Now, let’s see how we can bring a field which is *NOT* part of a Case Class body. For e.g:

```scala
trait BaseEntity {
  def desc: String
}
case class Item(itemCode: String, qty: Int, purchaseDate: LocalDate) extends BaseEntity {
  override val desc: String = itemCode + ":" + qty
}
```

If the above case class *Item* is converted into json, the field ***desc***, which is in the body of case class will not be available in the json string. To get such fields, we need to define a FieldSerializer and add to the *DefaultFormats*.

`implicit lazy val serializationFormats: Formats = new DefaultFormats {} ++ customSerializers + FieldSerializer[BaseEntity]()`

So, in this article we have seen how to use **json4s** to parse json strings, and how to write Custom Serializers for complex data types. The complete source code for the demo project is available in [GitHub](https://github.com/yadavan88/json4s-sample).
