---
title: "Tools to Get Started With Scala Programming"
pubDatetime: 2022-05-01T12:20:08.000Z
description: "Get a taste of Scala for the beginners"
tags:
  - "scala"
  - "thw-web-apps"
  - "scala-basics"
ogImage: "/images/posts/tools-to-get-started-with-scala-programming/21pTB5KDq.jpg"
---
> Discover the Top Tools for Writing Scala Code: scala-cli, ammonite REPL, Scastie, SBT, Maven, Gradle, and Mill. Learn how to install and use each tool, write and execute Scala code, add third-party libraries, package code as jars, and create docker images, with this comprehensive overview.

## 1. Introduction

Scala is an awesome programming language on top of JVM. Scala supports Pure Functional Programming, Object Oriented Programming or a mix of both.

Scala supports multiple build tools like SBT, Mill, Maven, Gradle and so on. There are used to build fully-fledged projects in Scala. However, for beginners, there are many other ways to get started with Scala.

In this article, let's look at different ways to start coding and learn the basics of Scala.

## 2. Installation and Setup

To start with Scala development, we need to first install the Scala compiler. As with any tools, we can download it from the official [Scala website](https://www.scala-lang.org/). However, I would suggest to use [Coursier](https://get-coursier.io/) to install the necessary tools. Coursier helps to get started with Scala developer environment in a single click. I have written a detailed article on installing and using Coursier [here](https://www.baeldung.com/scala/coursier-env-setup). Also, one may refer to this Coursier [Cheatsheet](https://github.com/yadavan88/coursier-cheatsheets) for quick start.

## 3. Scala REPL

Scala compiler also provides a REPL to try out the language features easily. If you have used Coursier setup from the previous section, it will automatically be installed already. Otherwise, you can install the scala compiler directly from the official website.

To start the REPL, use the command `scala`

This will start a REPL if it is already installed. It will show the version of the Scala compiler used for the REPL. We can write the scala code directly and it will get evaluated.

```scala
val greet = “Welcome to Scala REPL”
```

Scala REPL is really good to get started with learning Scala. Also, we can hit the Tab key for getting auto completion of Scala code. More details of all the supported features are available in this [link](https://docs.scala-lang.org/overviews/repl/overview.html). However, it is only useful if we are using the Scala standard library. If we need to use some other Scala library, it becomes impossible to do in the REPL.

## 4. Ammonite REPL

[Ammonite](https://ammonite.io/) is an advanced version of Scala REPL with many features. Ammonite REPL will also be automatically installed if the previous Coursier step was followed. Otherwise, one can follow the [installation steps](https://ammonite.io/#Ammonite-REPL) given in the ammonite's website.

To start the ammonite REPL, we can use the command: `amm`

This will start the ammonite REPL, which looks almost similar to the official Scala REPL. Unlike Scala REPL, ammonite REPL provides better syntax highlighting, pretty printing, multi line editing, history search, third party library loading, and so on. This makes it very popular in the Scala community. Apart from the REPl, ammonite also supports scala scripting using [Ammonite Scripts](https://ammonite.io/#ScalaScripts).

We can use ivy style dependency format to load thirdparty libraries in the REPL. For example, if we need to use a simple library like joda-time, we very easily try out in the ammonite REPL as:

```scala
import $ivy.`joda-time:joda-time:2.10.14`
```

Then we can import the *DateTime* class in the REPL and use it:

```scala
import org.joda.time.DateTime
val now = DateTime.now
```

## 5. Scala CLI

[Scala-cli](https://scala-cli.virtuslab.org/) is a recently introduced tool to quickly start writing scala code. It is not a REPL, but it helps to write, compile and package small scala files. We can install the scala-cli tool using the steps provided in the official website. We can check if it the installation is successful by running the command `scala-cli`. If installation is successful, you can see some help content printed on the console.

It helps to load either scala REPL or ammonite REPL using the scala-cli command. To start official Scala REPL, we can use:

```scala
scala-cli repl
```

To use Ammonite REPL instead, we can use the command:

```scala
scala-cli repl --amm
```

After installation, we can write a simple Scala file using your favourite editor. For example, we can write the following code to `Hello.scala` and save it to a directory:

```scala
object Hello extends App {
  println("Hello and Welcome to scala-cli !")
}
```

Then we can execute the command to run this file as:

```scala
scala-cli Hello.scala
```

This will compile the Scala file and also execute it since it extends App.

To just compile the file, we can use the command:

```scala
scala-cli compile Hello.scala
```

We can also add third-party libraries on our code. The syntax is different from the ammonite REPL. Let's add the same joda-time library to the Hello.scala file:

```scala
//> using lib "joda-time:joda-time:2.10.14"
import org.joda.time.DateTime
object Hello extends App {
  println("Hello and Welcome to scala-cli !")
  val now = DateTime.now
  println("Current Time is: "+ now)
}
```

There are many advanced features like packaging as jars, docker images, native images and so on. All these features are well documented in the official website.

## 6. Scastie

All the above tools need to be installed in the machine to run Scala code. However, there is an online tool *Scastie* which can be used on browser. This helps to start writing code in any machine without installing anything.

To use it, navigate to the link https://scastie.scala-lang.org/. We can directly add Scala code like in a REPL and we can run it with the click of a button. By using the *Build Settings* section, we can add library dependencies easily. It also allows to search and add the Scala library dependencies, so that we do not need to manually search on maven central for the coordinates.

Since it is online, we can easily share and make changes to the code between different people. This helps to get quick feedback and support from the community and teammates.

## 7. Other Tools

Apart from the above mentioned tools, we can always use the fully fledged build tools such as SBT, Maven, Gradle, Mill, and so on to write Scala code. SBT even supports scala REPL within the sbt session. This makes the dependencies added on SBT to be directly available on the REPL. To start a REPL on sbt project, we can do:

```scala
sbt // start sbt session
console // start scala REPL
```

## 8. Conclusion

In this article, we have looked at different ways in which we can start writing Scala code. This article is just to give a glimpse of all the tooling available in Scala community to get started. You can always refer to the official website of each tool to get more information about them.
