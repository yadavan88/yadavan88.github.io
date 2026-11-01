---
title: "Easy Integration Testing with TestContainer-Scala"
pubDatetime: 2022-12-02T06:00:42.000Z
description: "Non flaky integration testing with testcontainers-scala"
tags:
  - "docker"
  - "scala"
  - "testing"
  - "testcontainers"
ogImage: "/images/posts/easy-integration-testing-with-testcontainer-scala/T4svx8dvH.png"
---
## 1. Introduction

Integration Testing is a very important part of software development. It is generally better to have an integration testing environment as close to the production setup as to catch bugs early.

However, it is also cumbersome to set up all the required services and databases each time in all the required environments. In this short blog, let's look at [TestContainers-Scala](https://github.com/testcontainers/testcontainers-scala) which makes integration testing very easy and realistic.

## 2. Traditional Integration Test Setup

There are many different ways in which different companies and teams handle integration testing scenarios.

### 2.1. Shared Environment in the CI

The most common and easy way is to have a shared environment for the integration testing in the CI server. This way, a shared database, and services are used while the tests run in the CI environment.

However, the problem with this approach is that since it is a shared setup, multiple CI jobs can interfere and cause flaky behavior for the tests.

### 2.2. Use of Embedded Services

To avoid problems with a shared environment, we can use embedded/in-memory modes of services such as databases, Kafka, etc. For example, there are in-memory instances for [MongoDB](https://github.com/flapdoodle-oss/de.flapdoodle.embed.mongo), [Kafka](https://github.com/embeddedkafka/embedded-kafka), [PostgreSQL](https://github.com/zonkyio/embedded-postgres), and so on. However, some of the problems with this approach are:

* There should be an available in-memory version of the databases/services we need
    
* Not all services/databases could be made in-memory
    
* There is a chance that some of these become unmaintained later
    
* Not all features of a database/service might be available in the in-memory version
    

For the relational database, another option is to use the [H2](https://www.h2database.com/html/main.html) database with the relevant compatibility mode. But, not all features of a database might be available in H2.

### 2.3. Dockerized Environment

Another possibility is to use dockerized environment for all the services for a single run per CI job. This avoids all the previous issues. However, we still need to manually handle the creation and destruction of docker containers.

## 3. Usage of TestContainer

[TestContainers](https://www.testcontainers.org/) is a java library that helps to create lightweight docker instances for integration testing. It also has good integration with testing libraries which makes writing integration tests much easier.

[TestContainer-Scala](https://github.com/testcontainers/testcontainers-scala) is a scala wrapper over TestContainer-Java. It also has integration with [ScalaTest](https://www.scalatest.org/) and [MUnit](https://scalameta.org/munit/) testing frameworks. It provides ways to create docker containers per test case and per test suite. It already has support for almost all popular services and databases. Apart from that, we can also create and use custom modules for the services which are not yet supported by TestContainer.

This solves all the previously mentioned issues with other modes of integration testing. In the next section, let's look at some of its features.

## 4. Set Up

Let's first set up the required library dependencies in build.sbt:

```scala
 libraryDependencies ++= Seq(
  "com.dimafeng" %% "testcontainers-scala-scalatest" % "0.40.16" % "test",
   "com.dimafeng" %% "testcontainers-scala-postgresql" % "0.40.16" % "test"
   "org.postgresql" % "postgresql" % "42.6.0",
   "org.scalatest" %% "scalatest-flatspec" % "3.2.16" % Test,
   "org.tpolecat" %% "skunk-core" % "0.6.0"
)
```

This will add the test-container dependencies for *Scalatest* and *PostgreSQL* docker container. Additionally, we also have added the relevant libraries and drivers for the sample application to work.

Next, let's add the setting in *build.sbt* to use forked JVM for tests. This ensures a cleaner shutdown of the test setup:

```scala
Test / fork := true
```

## 5. Sample Usage - Single Container

Now, let's create a DAO file for writing database querying logic. In this case, I am using [Skunk](https://tpolecat.github.io/skunk/) to connect to PostgreSQL database. I am not showing the DAO code here for the sake of brevity. You can find the code [here on GitHub](https://github.com/yadavan88/blog-code-samples/blob/main/scala2/src/main/scala/com/yadavan88/testcontainer/postgres/PGDBConnection.scala).

Now, let's start writing the integration test class. As mentioned before, I am using ScalaTest in this case. We can extend our test with the trait `ForEachTestContainer` provided by testcontainer-scala. This forces us to override a member `container` with the required docker instance:

```scala
class TestContainerPGSpec extends AnyFlatSpec with ForEachTestContainer {
  override val container: PostgreSQLContainer = new PostgreSQLContainer()
}
```

**The trait *ForEachTestContainer* instantiates a new docker container for every test case and destroys it after the test is completed**. This is very useful in ensuring that the tests are not interfering with each other.

**Make sure that the overriden member *container* is a *val* and NOT a *def*.**

We can also use another **trait *ForAllTestContainer* instead, which creates a docker instance per test suite**.

Now, let's write a simple test to check if we are able to connect to this dockerized postgres container:

```scala
  it should "get current date from postgresql database" in {
    val dao = new PostgresDAO(getConfig)
    val dateIO = dao.getCurrentDate
    assert(dateIO.unsafeRunSync() == LocalDate.now)
  }
```

If everything is fine, this test passes successfully.

In the above example, we created the postgres container with default options. Sometimes, we might need to create a more configurable container. We can do that by using the *configure* method:

```scala
override val container: PostgreSQLContainer =
  PostgreSQLContainer().configure { c =>
    c.withInitScript("init_scripts.sql")
    c.withDatabaseName("test-database")
}
```

This creates a dockerized database with the databasse name as *test-database* and executes the initialisation scripts provided in the file *init\_scripts.sql* that is placed in the [resources](https://github.com/yadavan88/blog-code-samples/tree/main/scala2/src/test/resources) directory.

With this configuration, let's write additional test. The init script inserts 2 records for movies to the table and we can verify if it exists:

```scala
  it should "get rows from movie table" in {
    val dao = new PostgresDAO(getConfig)
    val rows = dao.getMovies.unsafeRunSync()
    assert(rows.size == 2)
    assert(rows.map(_.name) == List("Shawshank Redemptions", "The Prestige"))
    assert(rows.map(_.id).forall(_ > 0))
  }
```

TestContainer-Scala also provides *before* and *after* hooks. With this, we can execute some code before or after the container start and stop:

```scala
  override def beforeStop(): Unit = {
    println("Container is about to be stopped")
  }
  override def afterStart(): Unit = {
    println("Container is started")
  }
```

## 6. Multiple Container

TestContainer-Scala also **supports the usage of multiple containers within tests**. This helps us to test integration with different services, all dockerized without any impact on other tests.

To use that, we need to override the container member with *MultipleContainer* instance with the required containers. In this case, let's use postgres and mongoDB containers. Apart from the existing libraries, firstly let's add the mongoDB driver and container in our build.sbt:

```scala
libraryDependencies ++= Seq(
  "org.reactivemongo" %% "reactivemongo" % "1.0.10",
  "com.dimafeng" %% "testcontainers-scala-mongodb" % "0.40.11" % "test"
)
```

Now, let's instantiate the required containers:

```scala
val mongoDBContainer: MongoDBContainer = new MongoDBContainer()
val postgresContainer = PostgreSQLContainer().configure { c =>
    c.withInitScript("init_scripts.sql")
}
```

In the next step, we can create *MultipleContainers* and inject both the containers into it:

```scala
override val container = MultipleContainers(postgresContainer, mongoDBContainer)
```

Now, we can write the test where movies are fetched from postgreSQL database and inserted into mongoDB:

```scala
it should "get movies from postgres and insert into mongo" in {
  val config =
    MongoConfig(mongoDBContainer.container.getConnectionString(), "movies")
  val mongoDao = new MongoDao(config)
  val postgreDao = new PostgresDAO(getPostgresConfig)
  import cats.effect.unsafe.implicits.global
  for {
    pgMovies <- postgreDao.getMovies.unsafeToFuture()
    _ <- mongoDao.saveMovies(pgMovies)
    all <- mongoDao.getMovies()
  } yield {
    assert(all.size == 2)
    assert(all.map(_.name) == Seq("Shawshank Redemptions", "The Prestige"))
  }
}
```

That's it, this uses both postgres and mongo containers to run the test. The full test class code is available [here on GitHub](https://github.com/yadavan88/blog-code-samples/blob/main/scala2/src/test/scala/com/yadavan88/testcontainer/MultiContainerSpec.scala).

## 7. Generic Containers

If we need to use a container that is not supported by TestContainer-Scala, we can use *GenericContainer*. It allows to create custom containers with any configurations required for the application. So far, I didn't have to follow this approach, but more details are available [here](https://www.testcontainers.org/features/creating_container/).

We can also use [DockerCompose container](https://github.com/testcontainers/testcontainers-scala#docker-compose) to build a custom container for our test.

## 8. Conclusion

I hope that this blog helps you to get started with *TestContainers-Scala* and use it in your application to have better testing. Even though this brings an additional delay to the integration tests (to create and drop new containers), it is very useful in avoiding flaky test behaviours.

Please leave a reaction for this article, if you find it useful.

All the sample code and test cases are available [here on GitHub](https://github.com/yadavan88/blog-code-samples/tree/main/scala2/src).
