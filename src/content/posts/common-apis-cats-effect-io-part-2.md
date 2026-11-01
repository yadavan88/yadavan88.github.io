---
title: "Common APIs: Cats Effect IO [Part-2]"
pubDatetime: 2022-04-29T15:46:10.000Z
description: "We can also use flatten to avoid nested IOs:"
tags:
  - "scala"
  - "cats-effect"
---
## Introduction
In the [part 1](/posts/cats-effect-3-for-beginners-part-1/) of this series, we looked at *Cats Effect 3* and how to run a simple app written using it. In this part, let's look at some of the common APIs and methods used with IO datatype. 

## map, flatMap and for-comprehension
Since IO is monad, we can use the common operations like map and flatMap to chain IOs. Alternately, we can use for-comprehension as well.

```
val io1 = IO("Scala")
val io2 = IO("Cats")
val mapPgm: IO[String] = io1.map(_.toUpperCase)
val flatMapPgm: IO[String] = io1.flatMap(a => io2.map(a + _))
val forComp: IO[String] = for {
  a <- io1
  b <- io2
} yield a + b
``` 

We can also use *flatten* to avoid nested IOs:

```
val aIO: IO[String] = IO("Hello")
val anotherIO: IO[String] = IO(aIO).flatten
``` 
Cats Effect further provides another utility method to do this using *defer*:
 
```
val deferredIO: IO[String] = IO.defer(IO("String"))
``` 
**Please note that *IO.delay(anotherIO)* will create a nested IO, while *IO.defer(IO)* will return a flattened IO.**

## Other Simple Methods
To discard a result of an IO, we can use *void*.

```
val strIO: IO[String] = IO("Cats Effect")
val voidIO: IO[Unit] = strIO.void
``` 
To replace the value in an IO with another value, we can use *as* instead of *map*:

```
val asIntIO: IO[Int] = strIO as 100
``` 
To create an effect that prints content to console, we can use the helper method *IO.println()*:

```
val printIO = IO.println("Hello World")
``` 

## Handling Exceptions
Since IO describes an effect, there is a chance that the evaluation might fail at runtime. IO datatype can capture such failures as well. We can use *raiseError* to fail an IO.

### Creating IO with Errors

```
val aFailedIO: IO[String] = IO.raiseError[String](new Exception("Failed IO"))
``` 
If we want to create a failed IO based on some condition, we can use IO.raiseWhen(). It raises the provided exception if the condition matches else return IO[Unit]. This is especially useful to handle some undesired situations.

```
val raisedIO: IO[Unit] = IO.raiseWhen(num == 0)(new RuntimeException("Number can not be 0"))
``` 
Similarly, *IO.raiseUnless()* raises an exception when the condition doesn't match. 

### Handling Errors
We can handles the errors from an IO using *handleError()* method. This is similar to the *recover* on Future.

```
val handledIO: IO[Int] = aFailedIntIO.handleError(ex => 0)
``` 
We can also use *handleErrorWith* in the same way we use recoverWith on Future. The handler inside the *handleErrorWith* should return another IO.

```
val handledWithIO: IO[Int] = aFailedIntIO.handleErrorWith(_ => IO.pure(0))
``` 

We can also use redeem method to handle both success and failure cases together. This is similar to the *transform* method on *Future*. However, *redeem* takes the exception handling first and then the success handling.

```
val redeemedIO: IO[String] = intIO.redeem(_ => "failed", _ => "success")
``` 

## Lifting Common Types to IO
IO provides some utility methods to lift most common Scala types into IO. 

- *IO.fromOption* lifts Option[A] to an IO[A]
- *IO.fromTry* lifts Try[A] to an IO[A]
- *IO.fromEither* lifts Either[Throwable, A] to an IO[A]

We can also lift *Future* to an *IO* using the method *fromFuture*. However, to suspend Future execution, we need to wrap the Future in an IO first.

```
lazy val aFuture: Future[Int] = Future(100)
val ioFromFuture: IO[Int] = IO.fromFuture(IO(aFuture))
``` 

## Chaining IOs
We can use map, flatMap and for-comprehension to chain IOs. However, there are some other combinators that are available to chain different IOs. 

Let's define two IOs to explain the chaining as:

```
val firstIO: IO[Int] = IO(100)
val secondIO: IO[String] = IO("Millions")
``` 

Now, let's apply chaining using `*>` combinator:

```
val firstSecond: IO[String] = firstIO *> secondIO
``` 
It will execute *firstIO*, then the *secondIO* and discard the result of *firstIO* and returns the result of the *secondIO*. 

Now, let's use `<*` combinator. It runs the IOs in the same order, but keeps the result of the first and ignores the result of the second:

```
val secondFirst: IO[Int] = firstIO <* secondIO
``` 

There is another combinator `>>` which is almost similar to `*>`. The only difference is that `>>` is lazily evaluated and hence stack safe. Consider `>>` if recursion is involved:

```
val anotherCombinator: IO[String] = firstIO >> secondIO
``` 
There is another version `&>` and `<&` which are similar to `>>` and `<<`, but execute the IOs in parallel instead of sequential. 

```
val combinedParallel: IO[String] = firstIO &> secondIO
``` 


## IO Sleep
Cats Effect provides a very clean way to asynchronously make an IO sleep for specified time. It is called as *Semantic Blocking*.

```
val sleepingIO = IO.sleep(100.millis)
``` 
**Please note that, unlike *Thread.sleep*, *IO.sleep* will NOT block the thread.** Cats Effect will internally manage threads and handle sleep asynchronously. 

## IO Never
We can create a never terminating IO using the method *never*.

```
val neverEndingIO = IO.println("Start") >> IO.never >> IO.println("Done")
``` 
In the above code, the last IO which prints "Done" will never be executed since there is an *IO.never* just before it.

## Conclusion
In this part, we looked at some of the common and most useful combinators and methods on IO data structure. The sample code used here is available in [GitHub](https://github.com/yadavan88/cats-effect-intro) under the package *part2*.
