---
title: "Scala Exceptions - Try, try..catch and a caveat"
pubDatetime: 2022-10-21T18:12:17.000Z
description: "How does scala.util.Try differ from try-catch, and where scala Try don't work as expected!"
tags:
  - "scala"
  - "exceptionhandling"
  - "trycatch"
  - "scala-basics"
ogImage: "/images/posts/scala-exceptions-try-trycatch-and-a-caveat/xbR8LegIF.jpg"
---
> Learn about the various approaches to exception handling in Scala, and discover a peculiar situation that may arise while using scala.util.Try. This blog post delves into the fact that scala.util.Try is designed to handle only NonFatal exceptions, and explores the benefits of placing potentially problematic code within a try..catch block to obtain additional information. Additionally, this article offers valuable resources for further reading on Scala Exceptions and alternative methods for managing them.

## 1. Introduction

Exception handling is one of the most important and basic features of any programming language. There are many articles and blogs explaining the way we can handle exceptions in Scala.

I am not going to repeat the same things in this blog, and I will be leaving links to some of the resources available on the internet at the end of this blog. However, I would like to explain a particular scenario that might happen with exception handling in Scala, especially for newbies.

## 2. Approaches for Exception Handling

As you probably know, there are multiple ways in Scala to handle the exceptions, such as `scala.util.Try`, java style `try..catch` block, more functional ways like `Either` and so on.

Most people will be using `scala.util.Try` to handle exception scenarios. As a general practice, we would be wrapping the code block that might cause exceptions within the Try block, thus transforming the exception as data.

## 3. Strange Scenarios

As we discussed before if we are using `scala.util.Try`, we wrap the suspicious code within *Try* block and expect that if any exceptions are thrown it will make the result to be a Failure. Let's look at a simple example:

```scala
import scala.util._
object Test extends App {
  def someJVMMethod(): String = {
    throw new Exception("This is an exception")
  }
  val res: Try[String] = Try {
    someJVMMethod()
  }
  res match {
    case Success(s) => println("Successfully received: "+s)
    case Failure(ex) => println("Uh oh.. "+ex.getMessage)
  }
}
```

When we execute this app, it will print the message as below, since the *Try* contains the *Failure* details.

> Uh oh.. This is an exception to the console

However, assume that we are invoking a method from a third-party library within `someJVMMethod()`, for example, starting an embedded MongoDB server or an h2 database or something else. Since we have multiple libraries in the dependencies and there could be multiple versions of the same libraries within our application's classpath due to transitive dependencies. Due to this, there is a chance that this might lead to strange errors like binary compatibility issues between libraries.

If that happens within the method `someJVMMethod()`, let's see how the app behaves. For example, we can explicitly throw an `IncompatibleClassChangeError` to simulate the scenario. Let's re-write the method `someJVMMethod()` as:

```scala
def someJVMMethod(): String = {
  	throw new IncompatibleClassChangeError("Binary compatibilty issue")
}
```

If we execute the same code with this method instead, it will neither print the statements from the *Success* nor the *Failure* branches and instead just crashes without logging any details.

As the next step, let's add the `try..catch` block to the mix now and rewrite the way we invoke the method:

```scala
val res: Try[String] = Try { 
    try {
      someJVMMethod()
    } catch {
      case ex => 
        println("Message from catch.. "+ex)
        throw new RuntimeException(ex.getMessage())
    }
}
```

If we execute this now, we can see the output in the console and no crashing of the app:

> Message from catch.. java.lang.IncompatibleClassChangeError: Binary compatibilty issue Uh oh.. Binary compatibilty issue

## 4. Exploring the Reason for the Crash

Now, let's explore the reason for this behaviour. If we look at the source code of the exception class `IncompatibleClassChangeError` , we can see that it is extending `LinkageError` which extends `Error`, which again extends `Throwable`. As a general practice, we are supposed to handle only `Exception` and not `Error`, as errors are something which can't(should't) be recovered at runtime.

Now, if we look at the source code of [*Try*](https://github.com/scala/scala/blob/2.13.x/src/library/scala/util/Try.scala#L209), we can see that it actually uses `try..catch` under the hood, but handles only exceptions of type [*NonFatal*](https://github.com/scala/scala/blob/2.13.x/src/library/scala/util/control/NonFatal.scala). `NonFatal` is defined in Scala as all `Throwable` except `VirtualMachineError`, `ThreadDeath`, `InterruptedException`, `LinkageError` and `ControlThrowable`.

That means, ***scala.util.Try* will handle only *NonFatal* exceptions**. Since we got `IncompatibleClassChangeError` which is `LinkageError`, it was not handled by the `scala.util.Try` block and hence caused this strange behaviour. However, since `try..catch` block can catch any Throwable, we were able to handle it.

## 5. Conclusion

In this blog, we looked at some cases where *scala.util.Try* behaves differently from *try..catch* block. Even though we generally should not handle fatal errors, it is necessary to exactly identify the root cause for these errors when they occur. So in such cases, we can wrap the suspecting code within a plain old *try..catch* to get more details.

I hope this information comes in handy for you.

Here are some of the resources available to read more about Scala Exceptions and different ways to handle them.

https://www.baeldung.com/scala/exception-handling

https://www.baeldung.com/scala/error-handling

https://docs.scala-lang.org/scala3/book/fp-functional-error-handling.html

https://blog.rockthejvm.com/idiomatic-error-handling-in-scala/

https://zio.dev/overview/overview\_handling\_errors

https://softwaremill.com/practical-guide-to-error-handling-in-scala-cats-and-cats-effect/
