---
title: "Introduction to Clear-Config in Scala"
pubDatetime: 2022-04-06T19:40:29.000Z
description: "mongo.dbName = \"mongoDB\" mongo.username = \"mongoUser\" "
tags:
  - "scala"
  - "configuration"
---
## 1. Introduction
Configurations are essential parts of any software application. In the previous blog, we looked at [PureConfig](/posts/loading-configs-in-scala-using-pureconfig/) for handling configurations files in Scala. In this blog, we will look at another library which provides even more safety.

## 2. Problem
Even though PureConfig adds type-safety and loads the configurations without boiler-plate code, there still exists some risks. Let's look at different possible scenarios where PureConfig and other such libraries fail.

### 2.1. Configuration Mistake in Different Environment
It is a general practice to have different configuration files for each environments like *prod*, *test* and *local*. After successfully testing in the test env and while deploying to prod env, we might find out that the app is not starting due to a config mistake in the prod environment config file. It is very difficult to verify each of these cases before every deployment.

### 2.2. Unused Configurations
Sometimes we may have unused configurations in the config files. It is a pain to search and find out the unused configs. Sometimes we might make some small spelling mistakes in one of the config file and might not even detect it until too late!

### 2.3. Overriding of Config Values
Sometime, we might need to override the config values. This is very useful in creating a hierarchy of config environments and use from the relevant levels based on the priority. For example, we can have a config for a path for a directory. It will be nice to dynamically change this value while testing. We can do this by passing java classpath arguments or by using environment variables in the target machine. However, it is a challenge to visualise and understand which config value is used for a particular scenario.

## 3. Clear-Config 
[Clear-Config](https://github.com/japgolly/clear-config) is a small and nice library which helps to solve all the above pain points. 

### 3.1. Advantages of Clear-Config
Some of the advantages of using Clear-Config are:
- Clarity on which configs are used
- Early detection of config mistakes across different environment
- Type-safe and pure FP config library
- Very composable
- Multi level design of configuration sources

### 3.2. Disadvantages
Unfortunately, Clear-Config doesn't support HOCON style config format. So, each of the config needs to be provided with appropriate prefixes for clear separation. For instance, if we have separate config for postgres and mongo database, we can provide the config as:

```
postgres.dbName = "pgDB"
postgres.username = "pgUser"

mongo.dbName = "mongoDB"
mongo.username = "mongoUser"
``` 

## 4. Setup
To use Clear-Config, add the sbt dependency:
```
libraryDependencies += "com.github.japgolly.clearconfig" %% "core" % "3.0.0"
```
Note that, **Clear-Config has dropped the support for Scala 2.12. As of now, it supports only *Scala 2.13* and *Scala 3*.**

## 5. Clear-Config Usage
In this section, let's go through different usages of Clear-Config.

### 5.1. Single File Config
Now, let's see how we can use Clear-Config. For the sample code, we can first create the necessary config file. 
Let's put the below content in *application.conf* file:

```
host = "postgresql://localhost:5432"
dbName = "configs"
username = "admin"
password = "pwd!#+"
maxConnection = 5
``` 
As a next step, let's create a case class corresponding to the config properties:

```
final case class DatabaseConfig(
  host: String,
  dbName: String,
  username: String,
  password: String,
  maxConnection: Option[Int]
)
``` 
Now, we need to add the required imports for using this library. Clear-Config uses the library *cats* under the hood:
```
import japgolly.clearconfig.*
import cats.implicits.*
```

Next, we need to create a sort of mapping between the config properties and the case class fields. Clear-Config provides different methods like *need*, *get* and *getOrUse*, to handle *mandatory*, *optional* and *default* config properties respectively.

Let's create this mapping in the companion object of the case class. For simplicity, we will be using the effect type *Id* here. We need to add the necessary imports also for it to work:

```
import cats.Id
import cats.catsInstancesForId
object DatabaseConfig {
  def config: ConfigDef[DatabaseConfig] = (
    ConfigDef.need[String]("host"),
    ConfigDef.need[String]("dbName"),
    ConfigDef.need[String]("username"),
    ConfigDef.need[String]("password"),
    ConfigDef.get[Int]("maxConnection")
  ).mapN(apply)
}
```
In the next step, we need to define the config source. This is the place where we map the config file name to the config classes:

```
def configSources: ConfigSources[Id] = ConfigSource
        .propFileOnClasspath[Id]("/application.conf", optional = false)
```

Now, we are ready to read the config file:
```
val dbCfg: DatabaseConfig = DatabaseConfig.config.run(configSources).getOrDie()
```
If there is some mistake with the config file, the application will fail to start and provide the reason.

### 5.2. Multi Config Mapping
In the previous section, we have only single source of config. Now, let's see how we can use multiple sources. Let's assume that we have we have config file for each environment, which adds the string ${env} based on each environment.
For example, let's add another file *application-prod.conf*. 
We expect the *application-prod.conf* file has more priority in the production env and if any config is is provided in that file, it should be considered instead of from the the *application.conf*.
For doing this, we need to define 2 sources and combine them together using ***>*** :
```
def configSources: ConfigSources[Id] = 
ConfigSource.propFile[Id](sysFilePath, optional = true) >
      ConfigSource
        .propFileOnClasspath[Id]("application-prod.conf", optional = true) >
      ConfigSource
        .propFileOnClasspath[Id]("/application.conf", optional = false)
```
Now, if it finds any properties in *application-prod* file, it will be used. If some properties are not available, then it will use from *application.conf*. Also note that we have mentioned that the *application-prod.conf *file as optional.

### 5.3. Using Environment Variable
Along with the files, we can also use environment variables to handle config. For instance, assume that some property is set in the environment of the target system, we can use them in the same way as the other sources:

```
def configSources: ConfigSources[Id] = ConfigSource.environment[Id] > 
  ConfigSource.propFileOnClasspath[Id]("application-prod.conf", optional = true) >
  ConfigSource.propFileOnClasspath[Id]("/application.conf", optional = false)
``` 
Now, the first priority will be for the *environment variable*, then *application-prod.conf* and at last *application.conf*

### 5.4. Using Config File Outside Classpath
We can also load config file from outside the classpath/resources directory. For this, instead of using *propFileOnClassPath()* method, we can use *propFile()* with absolute path to the file:

```
ConfigSource.propFile[Id](sysFilePath, optional = true)
```

### 5.5. Read Properties from JVM Flags
Similar to environment variable, we can also read the property from javac flags we pass while the app is starting. For that, we can use the method *ConfigSource.system[Id]*.
For example, we can pass the value for *dbName* as jvm arg as:

```
sbt -DdbName=jvmDB "project runMain <path_to_class>/ConfigLoader"
``` 

## 6. Generating Report
One of the most powerful feature of Clear-Config is the report it generates regarding the config properties. With this table structured report, we can identify which config is used from which file. 
We can generate the report by using the method ***.withReport()***. This will return a tuple of config class and *ConfigReport* instance. We can invoke thee method *full()* on ConfigReport to generate a tabular report as shown below. 

```
val (dbCfg, report): (DatabaseConfig, ConfigReport) =
    DatabaseConfig.config
      .withReport
      .run(configSources)
      .getOrDie()
``` 

It displays which config is used from which source, and the left one has the highest priority. It also provides a list of unused configurations.

![report_full.png](/images/posts/introduction-to-clear-config-in-scala/8RYuCve2i.png)

## 7. Config Errors
If any of the configuration in the provided source is wrong, then the application will fail to start. That means, **even if production config file has a mistake, running in test or local environment will cause the app to crash**. This way we will not miss out the config mistakes from other sources. 

## 8. Additional Features
There are many more features available in Clear-Config. Here are some of the ones which I am particularly interested in.

### 8.1. Case Insensitive Config
To read the configs without worrying about the case, we can use the method *caseInsensitive* while defining the sources. 
```
ConfigSource.environment[Id].caseInsensitive
```
This will read the config properties ignoring the case. 

### 8.2. Configuration Prefix
As mentioned, one of the disadvantages of ClearConfig is that HOCON style config is not supported. So, to read the separated configs, we can use the *withPrefix* method. For accessing mongo properties:

```
DatabaseConfig.config.withPrefix("mongo.").run(configSources)
``` 
For using postgres:

```
DatabaseConfig.config.withPrefix("postgres.").run(configSources)
``` 

## 9. Conclusion
In this short article, we looked at Clear-Config and how to get started with it. There are still more powerful features which are available in Clear-Config. These can be explored from its [GitHub](https://github.com/japgolly/clear-config) repository. The code samples used in this article is available [over on GitHub](https://github.com/yadavan88/scala-tutorials/tree/clear-config/scala3-lang-2).
