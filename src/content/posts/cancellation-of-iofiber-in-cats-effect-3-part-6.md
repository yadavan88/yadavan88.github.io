---
title: "Cancellation of IO/Fiber in Cats Effect 3 [Part 6]"
pubDatetime: 2022-05-18T21:52:18.000Z
description: "This is the sixth part of Cats Effect series. In the part 4 of this series, we looked at concurrent programming in Cats Effect 3 using Fibers. In this part, we'll look at cancellation of already..."
tags:
  - "scala"
  - "functional-programming"
  - "thw-web-apps"
  - "cats-effect"
ogImage: "/images/posts/cancellation-of-iofiber-in-cats-effect-3-part-6/cg3uryILf.jpg"
---
## Introduction

This is the sixth part of Cats Effect [series](/tags/cats-effect/). In the [part 4](/posts/concurrent-execution-in-cats-effect-using-fibers/) of this series, we looked at concurrent programming in Cats Effect 3 using Fibers. In this part, we'll look at cancellation of already running IOs/Fibers.

## Cancellation

One of the most valuable features of Fibers is the ability to cancel them if it is not needed any more. This way, **we can save resources and also avoid CPU usage of the unwanted fibers**. We can use *cancel* method on the fiber handle to cancel a running fiber:

```scala
val longRunningIO =
  (IO("Start processing").trace >> IO.sleep(500.millis) >> IO(
    "Task completed"
  ).trace)
    .onCancel(IO("This IO got cancelled").trace.void)

val fiberOps = for {
  fib <- longRunningIO.start
  _ <- IO.sleep(200.millis) >> IO("cancelling task!").trace
  _ <- fib.cancel
  res <- fib.join
} yield ()
```

This way, we can cancel the execution of a fiber manually. However, there are some other ways in which the cancellation of fibers can be done. Some of these methods uses the simple *cancel* method under the hood, but **it makes it even easier for the developers to not worry about the cancellation manually**.

## Racing of Fibers

Instead of manually handling the life cycle of a fiber, we can use race two IOs and take the result of the first completed one. This way, cats effect runtime will automatically create and handle the lifecycle of the fibers. The developers need not worry about cancellation of the slow one and joining of the fast one.

Let's look at it with a scenario. Assume that, we are querying from two different services and use the result of thee first completed service proceed further. We can use a simple fiber for both the operations and cancel the other fiber when one of the fiber completes the task.

### IO.race()

The same logic can be implemented in using *race*. The cats effect runtime will manage the fibers and cancels the slow fiber and returns the result from the fast one. Let's look at a simple example:

```scala
val io1 = IO("Task 1 starting..").trace >> IO.sleep(Random.nextInt(1000).millis).trace >> 
  IO("Task 1 completed").trace
val io2 = IO("Task 2 starting..").trace >> IO.sleep(Random.nextInt(1000).millis).trace >> 
  IO("Task 2 completed").trace

val raceIOs: IO[Either[String, String]] = IO.race(io1, io2)
val raceResult = raceIOs.map { _.match {
  case Right(res) => println(s"io2 finished first: `${res}` ")
  case Left(res) => println(s"io1 finished first: `${res}` ")
}}
```

In the above sample code, IOs *io1* and *io2* completes the task based on the sleep value provided. When IO.race() is invoked with *io1* and *io2*, the first completed result is returned in as an *Either* result. If *io1* completes first, the Either result will be completed with a *Left* value and otherwise with a *Right* value. **Here, completion doesn't necessarily means successful execution**. If an IO fails fast, then the other one is cancelled immediately.

### IO.racePair

***RacePair* is a more generic version of *race()***. Instead of cancelling the slow fiber, it returns the handle to that fiber along with the outcome of the first one. **The developer can then take decision to either cancel immediately, or do some other operations before cancelling or not to cancel at all.**

Instead of returning a simple Either with the result, *racePair* returns an Either of a tuple with Outcome of the completed fiber and the handle to the other fiber. This allows more finer control of the fibers while racing them.

Let's look at it with another simple example:

```scala
val racePairResult: IO[Either[(OutcomeIO[String], FiberIO[String]), (FiberIO[String], OutcomeIO[String])]] = IO.racePair(io1, io2)
```

## IO timeout

Cats Effect implements timeout method on IO to using the same fiber cancellation. We can cancel an IO execution if it takes more than a desired duration using *timeout()* method. For instance, let's see how can can make sure that an IO takes atmost 500 millis to execute it, and raise an exception if it takes more time.

```scala
val maybeSlowIO = (IO("Task is starting..").trace >> IO
  .sleep(Random.nextInt(1000).millis)
  .trace >> IO("Task is completed").trace)
  .onCancel(IO("Cancelled this IO since it is slow").trace.void)

val ioExec: IO[String] = maybeSlowIO.timeout(500.millis)
```

If the IO *maybeSlowIO* takes more than 500 milli seconds, it will be cancelled and a *TimeoutException* will be raised. This method is very useful in handling strict duration operations.

There is another variation of *timeout* as *timeoutTo*, which allows to execute a fallback IO incase the timeout occurs. We can re-write the timeout sample code above as:

```scala
val timeoutWithFallback = maybeSlowIO.timeoutTo(500.millis, IO("Fallback IO executed").trace)
```

## Uncancelable

So far, we have looked at different ways in which an IO or a Fiber is cancelled. Sometimes we need to make sure that some part of the execution is not to be cancelled. For example, after a database operation if we are updating a cache, we need to make sure that the update operation completes. Otherwise, it can lead to dirty cache if the operation got cancelled in between. We can make a block of code free from cancellation using *uncancelable* method.

Using uncancelable, we can mark a code to be not cancellable. Even if a cancel request is raised, the cancellation of any code within the *uncancelable* block will be denied. Let's see how we can do that:

```scala
val step1 = IO("Step 1").trace
val importantTask = IO.uncancelable(unmask =>
  IO("uncancelable start").trace >> IO.sleep(1.second) >> IO("task completed") >> IO("uncancelable end").trace
)
val step3 = IO("Final step ").trace

val tryCancel = for {
  _ <- step1
  fib <- importantTask.start
  res <- IO.sleep(400.millis) >> IO("trying to cancel importantTask").trace >> fib.cancel
  _ <- fib.join
} yield ()
```

In the above code, the *importantTask* take 1 second to complete. However, we are trying to cancel the fiber after 400 milliseconds(i.e. before the execution completes). But the cancellation invocation has no impact on that fiber since *importantTask* is wrapped within *uncancelable* block. Please note that we can make a part of the block cancellable by wrapping with *unmask* callback within the block.

If we want to make the entire IO uncancelable, we can use *uncancelable* on the IO as:

```scala
val fullUncancelable = importantTask.uncancelable
```

We can create multiple regions of uncancelable IOs using the *unmask* callback. **Only the block wrapped within *mask* callback will become cancelable, outside it the IOs becomes uncancelable**. For instance:

```scala
val unmaskBlocks = IO.uncancelable(unmask => unmask(IO("Step1")) >> IO("Step2") >> unmask(IO("Step3")))
```

*In the above code, the step1 and step3 can be cancelled as it is wrapped within unmask, while step2 can NOT be canceled.*. \*\*The *unmask* block helps to cancel a part of otherwise uncancelable chain. \*\*

## Conclusion

In this part, we looked at fibers and different ways of cancellation. The sample code used here is available in [GitHub](https://github.com/yadavan88/cats-effect-intro) under the package *part6*.
