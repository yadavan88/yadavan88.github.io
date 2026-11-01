---
title: "Cats Effect 3 for Beginners [Part-1]"
pubDatetime: 2022-04-28T15:23:25.000Z
description: "Scala Cats Effect tutorial"
tags:
  - "scala"
  - "thw-web-apps"
  - "cats-effect"
ogImage: "/images/posts/cats-effect-3-for-beginners-part-1/cb-QBZCtU.jpg"
---
> For Scala developers who are new to **Cats Effect**, this article series aims to provide a comprehensive guide on how to use the effect system that helps control the execution of events. The series covers the concept of an effect, the importance of an effect system, and a step-by-step guide on creating and executing effects using the Cats Effect. Additionally, it delves into the IO Monad and its diverse range of operations that can be performed.

## Introduction

*Cats Effect* is one of the most popular effect systems in Scala. In this series of articles, let's look at some of the most important features of Cats Effect.

**This series is intended for Scala developers who are complete beginners to Cats Effect**. However, I assume that the readers know the basics of Scala and have mostly worked with scala's *Future*. Note that, this is not intended to explain all the features of Cats Effect, but merely to get started with Cats Effect. There are numerous other blogs, youtube videos and code samples that explains the features in deep.

## What is an Effect ?

Effect is a description of an action, rather than the action itself. It describes what may happen when the action is executed.

## What is the need for an Effect System?

Effect system helps the developers to control the execution. We can describe the events in detail and compose multiple effects to create a long chain of related effects. We can then execute the effects only when it is needed. That means the effect systems allows us to handle the events lazily. That is not possible using scala's *Future*.

Let's look at it with the common example:

```scala
val futurePrint: Future[Unit] = Future(println("Hello from the Future"))
```

This code will immediately start execution, eagerly. We cant control when the future should be executed. This is where effect systems like Cats-Effect comes in picture. It helps to describe the computation, but execute them on demand.

*IO* is the most important and common effect in Cats-Effect. **We will be using the latest *Cats Effect v3* for this series**. For that we can add the dependency:

```scala
 libraryDependencies += "org.typelevel" %% "cats-effect" % "3.3.11"
```

## How to Create IO?

There are multiple ways to create an IO data structure. Let's look some of the ways.

### Using *pure* Method

Similar to *Future.successful*, IO also support *pure* method to lift an already executed value into IO type.

```scala
val scalaIO: IO[String] = IO.pure("Scala")
```

**Note that, *IO.pure()* method should be used only if the value is already computed and available.**

### Using *apply* Method

Like all other types in Scala, we can also use the apply method of IO to create IO effect:

```scala
val scalaIOApply: IO[String] = IO("Scala")
```

### Using *delay* Method

We can use the IO.delay() method also to create IO data structure. It is exactly same as invoking the *apply* method.

```scala
val scalaIODelayed: IO[String] = IO.delay("Scala")
```

There are more advanced ways to create IO types, but we will look at them in later sections.

## IO Monad

IO is a Monad. We don't really need to go in deep on the theoretical concepts of Monads. For now, we can assume that IO is a container type like *Option*, *Either*, *Future* etc. We can apply the common methods like *map*, *flatMap*, *identity* etc on IO types as well. Since it has *flatMap* and identity, we can use *for-comprehension* on IO types just like *Future*.

## Executing the Effect

Now, let's look at how we can execute the effect we created before. We have mainly 3 ways to get started.

### Using Scala App and *main()* method

We can write a normal Scala object and extend with *App* or implement the *main* method. Then we can use the method *unsafeRunSync()* on IO to execute the effect. However, we need to provide an implicit *IORunTime* instance. We can provide it by importing *cats.effect.unsafe.implicits.global*.

```scala
import cats.effect.IO
import cats.effect.unsafe.implicits.global
object CatsEffectScalaApp {
  val scalaIO = IO(println("Welcome to Cats Effect 3"))
  def main(args: Array[String]): Unit = {
    scalaIO.unsafeRunSync()
  }
}
```

### Extending with *IOApp*

Instead of using the default *main* method, we can use the cats provided *IOApp*. We need to extend the main app with IOApp and override the *run* method.

```scala
object CatsEffectApp extends IOApp {
    val io: IO[Unit] = IO(println("Welcome to Cats Effect 3"))
    override def run(args: List[String]): IO[ExitCode] = io.map(_ => ExitCode.Success)
}
```

Since the *run* method must return *IO\[ExitCode\]*, we can *map* our IO and return the necessary code back.

### Extending with *IOApp.Simple*

Instead of extending the IOApp, we can extend *IOApp.Simple*. Now we can implement *run* method. The only difference between run method of *IOApp* and *IOApp.Simple* is that run method of IOApp.Simple returns *IO\[Unit\]*, which is more common in general.

```scala
object CatsEffectSimpleApp extends IOApp.Simple {
  val io: IO[Unit] = IO(println("Welcome to Cats Effect 3"))
  override def run: IO[Unit] = io
}
```

## Conclusion

In this article, we saw how to create a very simple application using Cats Effect. We will look at more features in the next part. The sample code used here is available in [GitHub](https://github.com/yadavan88/cats-effect-intro) under the package *part1*.
