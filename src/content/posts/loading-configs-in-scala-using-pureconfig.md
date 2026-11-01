---
title: "Loading Configs in Scala using PureConfig"
pubDatetime: 2022-04-06T19:40:28.000Z
description: "We can create the required case classes to hold the configurations. Pureconfig can then load the config from the files to these config classes. Pureconfig can handle HOCON, JSON and Properties..."
tags:
  - "scala"
  - "configuration"
---
## Introduction
Configurations are an important part of any application. Different configurations are loaded and processed for the application to work properly.
Many a times, repetitive and boilerplate code is needed to handle and load the configurations. Also, we need to write code for handling types of each config. 
If all these boilerplate code can be auto-generated, it makes handling and maintaining configurations easy. And that is what [PureConfig](https://github.com/pureconfig/pureconfig) does.

We can create the required case classes to hold the configurations. Pureconfig can then load the config from the files to these config classes. Pureconfig can handle *HOCON*, *JSON* and *Properties* files by default.

## Setup
To use pureconfig, add the dependency as:
```
libraryDependencies += "com.github.pureconfig" %% "pureconfig" % "0.17.1"

```

## Types
Pureconfig can handle most of the [types](https://pureconfig.github.io/docs/built-in-supported-types.html) automatically.  We can write custom converters for non supported types.

## Load config from application.conf

Let's try to load a simple configuration from application.conf file. For example, let's say that we have database config:
```
url = "postgresql://localhost:5432"
database-name = "configs"
```

Firstly, we need to create a case class corresponding to the config:
```
final case class DatabaseConfig(url:String, databaseName:String)
```
Note that, **by default the pureconfig expects the configuration fields in kebab case(e.g: *database-name*) and the case class fields in camel case(e.g: *databaseName*)**. We can configure different formats by providing hints to the pureconfig.

Now, let's load the config:
```
val dbConfResult: ConfigReader.Result[DatabaseConfig] = ConfigSource.load[DatabaseConfig]
```

*ConfigReader.Result[DatabaseConfig]* is just an alias for *Either[ConfigReaderFailures, DatabaseConfig]*. It can be handled like any other *Either* values.

```
dbConfResult.right.get.databaseName shouldBe "configs"
```

## Load config at a specific node
We can also load config from a specific config root. Let's define the config in application.conf as:

```
http {
    port = 8090
    host = "localhost"
    protocol = "https"
    default-timeout = 8s
}
``` 
Next, we need to create case classes to hold this configurations. Note that we have different types of values such as Int, String and FiniteDuration.


```
val httpConf = ConfigSource.default.at("http").load[HttpConfig]
``` 

## Load config from a custom file
We can also load the configs from a custom file. Let's move the database configurations to a separate file database.conf. Now, let's load the config from that file:

```
val dbConf = ConfigSource.resources("database.conf").load[DatabaseConfig]
```

## Load config from String
Pureconfig can parse a string value to the relevant config classes. We can use the source as *string* instead of *resources* for this:

```
val dbConfStr = ConfigSource.string("""{"database-nam": "strDB", "url":"mysql://localhost"}""")
``` 

## Customise config format
By default, Pureconfig expects the config keys in kebab case and the case class fields as camelCase. We can override this by providing an implicit hint. 
To use camel case for both config and case class fields, we can define hint as:
```
implicit def hint[A] =ProductHint[A](ConfigFieldMapping(CamelCase, CamelCase))

```
Apart from CamelCase, Pureconfig provides other formats such as *PascalCase*, *SnakeCase*, *ScreamingSnakeCase* and *KebabCase*.

## Use custom types
Apart from the default types, we can extend Pureconfig to support custom types. Pureconfig already has [integrations](https://pureconfig.github.io/docs/library-integrations.html) for many common libraries such as *JodaTime*, *Enumeratum*, *Circe*, and so on.
Let's look at how we can use Enumeratum type in configurations. Firstly, we need to define the configurations:

```
name = "mainApp"
env = Prod
startDate = "2022-01-02"
``` 
We need to define the enums for *env* in Enumeratum:
```
sealed trait Env extends EnumEntry
object Env extends Enum[Env] {
  case object Prod extends Env
  case object Test extends Env
  override val values = findValues
}
```
Now, let's define the case class to hold the configuration values:
```
final case class BaseAppConfig(name: String, startDate: LocalDate, env: Env)

```
To use Enumeratum integration, we need to import:
```
import pureconfig.module.enumeratum._
```
Now, we can load the config as:
```
implicit def hint[A] = ProductHint[A](ConfigFieldMapping(CamelCase, CamelCase))
val baseConfig = ConfigSource.default.load[BaseAppConfig]
```

## Throw Exception on Failures
Sometimes, it is required to throw exception and fail the application start if configurations are not proper. We can do that by using the method *loadOrThrow* while loading the config:

```
val conf = ConfigSource.string("""{"databaseName": "strDB", "url":"mysql://localhost"}""").loadOrThrow[DatabaseConfig]
``` 
## Conclusion
In this short tutorial, we looked at how we can use Pureconfig to load the configuration files. The sample code used here is available [over on GitHub](https://github.com/yadavan88/scala-tutorials/tree/pureconfig/scala-libraries-2).
