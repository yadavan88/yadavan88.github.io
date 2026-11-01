---
title: "Error Handling in Cats Effect [Part-9]"
pubDatetime: 2023-04-23T13:07:29.000Z
description: "Various ways to perform error handling in Cats Effect 3"
tags:
  - "functional-programming"
  - "cats"
  - "cats-effect"
ogImage: "/images/posts/error-handling-in-cats-effect-part-9/40617721-1396-4eff-85dc-6619819c2b75.jpeg"
---
## 1. Introduction

This is another part of the [Cats Effect 3 series](/tags/cats-effect/). In this short part, let's look at some of the ways to handle errors in Cats Effect 3.

## 2. Raising an Error

Firstly, let's see how we can raise an error in CE. We can create a failed IO instance using the *raiseError* method:

```scala
val failedIO: IO[Int] = IO.raiseError(new RuntimeException("Boom!"))
```

## 3. Handling Errors

Now, let's see different ways to handle error values in CE.

We can handle errors on IO by using `handleError` and `handleErrorWith` methods:

```scala
val handledError = failedIO.handleError(ex => 500)
val handledErrorWith = failedIO.handleErrorWith(ex => IO(-2))
```

In case of a failure, the *handleError* block is executed and that value is returned instead of the input value. We need to return an IO from `handleErrorWith` block, where as a plain value is returned from the `handleError` block.

We can also use *recover* and *recoverWith* methods to transform a failed IO effect:

```scala
val recoveredFailedIO: IO[Int] = failedIO.recover {
  case ex => 0
}
```

The method `recover` takes a partial function and we can apply pattern matching on the exceptions to return a desired value. In the previous example, we can return a value of 0 in case of a failure. Similarly, we can use `recoverWith` to return an effectful value inside the partial function instead of a plain value:

```scala
val recoveredWithFailedIO: IO[Int] = failedIO.recoverWith {
  case ex => IO(0)
}
```

In this case, we have to return an *IO* within the pattern matching.

**This is similar to the *recover* and *recoverWith* methods available on *Future*.**

**The main difference between** `handleError` **and** `recover` **method is that the** `recover` **method takes a partial function, which enables us to easily handle different types of errors in different ways**. Let's look at an example:

```scala
val errorIO = IO(100/0)
val recoveredFailedIO: IO[Int] = errorIO.recover {
  case ex: ArithmeticException => 0
}
```

In the above case, the `errorIO` value will be transformed into `IO(0)` in case of `ArithmeticException`. For any other errors, the same failure value will be returned since we don't have a matching `case` statement for them.

If we want to merely perform a side effect on failure, such as logging the exception, we can simply use the method *onError*:

```scala
val loggedFailedError: IO[Int] = failedIO.onError(ex => IO.println("It failed with message: "+ex.getMessage))
```

Using *onError()*, we are logging the error message to the console and returning the same IO effect back. In Scala Future, we need to do `failedFuture.failed.foreach` method to perform an action on a failed future.

We can use the method `attempt` to lift the value of an IO into an Either. If the IO failed, it lifts the value as *Right*, otherwise into a *Left*:

```scala
val attemptedIO: IO[Either[Throwable, Int]] = loggedFailedError.attempt
```

There is a method `rethrow()` that is the inverse of the `attempt` method. It converts an `IO[Either[Throwable, A]]` to `IO[A]`. If the either is a Right, the value will be lifted into IO, otherwise it will be a failed IO:

```scala
val eitherValue: IO[Either[Throwable, String]] = IO.pure(Right("Hello World"))
val rethrownValue: IO[String] = eitherValue.rethrow
```

Another way to operate on a failed IO is by using `orElse()`:

```scala
val orElseResult1: IO[Int] = IO(100).orElse(IO(-1)) //returns IO(100)
val orElseResult2: IO[Int] = failedIO.orElse(IO(-1)) //returns IO(-1)
```

## 4. Conclusion

In this short part, we discussed various options available in Cats Effect to handle errors. The sample code is available [here](https://github.com/yadavan88/cats-effect-intro/tree/main/src/main/scala/com/yadavan88/ce/part9) on GitHub.
