---
title: "Concurrent Execution in Cats Effect using Fibers [Part 4]"
pubDatetime: 2022-05-09T07:49:20.000Z
description: "Parallelism is a way by which multiple computations run at the exact same time. This generally utilises multiple processor cores to execute each computation. The methods parSequence, parTraverse..."
tags:
  - "scala"
  - "cats-effect"
---
## Introduction
This is the fourth part in the Cats Effect 3 [Blog Series](/tags/cats-effect/). In the [previous part](/posts/traversing-cats-effect-ios-part-3/), we looked at different ways to traverse and chain IOs. We also looked at parallel APIs of Cats Effect IO. 
In this part, we will look at one of the most important features of Cats Effect 3, called as **Fibers**. 

## Concurrency vs Parallelism
Before learning about fibers, we shall first understand the difference between parallel and concurrent execution. 

**Parallelism is a way by which multiple computations run at the exact same time**. This generally utilises multiple processor cores to execute each computation. The methods *parSequence*, *parTraverse* etc uses this approach.

Concurrency doesn't necessarily imply that the computations are executing at the same time. Instead, they are interleaved. **It means that multiple tasks are done by the same thread by switching between them whenever possible**. In other words, consider it as juggling between different task without wasting any free time.  

A very detailed explanation can be read on the Cats Effect [documentation page](https://typelevel.org/cats-effect/docs/2.x/concurrency/basics).

## Fibers
**Fibers are like very light-weight thread in Cats Effect 3**. They are the building blocks of Cats Effect concurrency model. We can create as many fibers are needed without worrying about the thread and threadpool. These fibers can be created, joined or cancelled. 
Cats Effect runtime takes care of scheduling these fibers on the real threads. Hence a developer need not worry about the underlying threads or the way to handle them at all.  
**Fibers implement semantic blocking**, which means that the underlying threads are not blocked by the CE runtime. Also, a fiber is not locked to a particular thread. Hence, a fiber may execute across multiple threads before the task is completed depending on the availability of threads. 
These fibers can be loosely compared with *Akka Actors*, even though the actor model is a completely different paradigm. 

## Usage
Now, let's see how we can create and use fibers to handle concurrent execution. We can invoke `.start` method on an IO to create a fiber. We can use `.join` method on the fiber to wait for the result. Let's look at it with an example:

```
val io: IO[Int] = IO("Long computation").trace >> IO.sleep(1.second) >> IO(
  Random.nextInt(1000)
) <* IO("Computation done!").trace

val fibersIO: IO[Outcome[IO, Throwable, Int]] = for {
  fib <- io.start
  fiberOutcome <- fib.join
} yield fiberOutcome
``` 
 In the above code, `io.start` creates a fiber and executes the IO in a different thread. 
The `trace` extension method we created on IO will print the thread name on which the IO is getting executed. This way we can verify the concurrent execution of fibers. 
We can invoke `join` method on the fiber handle, `fib` to get the result of the execution.  It returns a type `Outcome`, which contains the different possibilities of fiber execution. The three possibilities are *Succeeded*, *Errored* and *Canceled*. We can do a pattern match on the outcome to handle the results:

```
fiberOutcome match {
    case Succeeded(fa) => IO.println("Fiber succeeded with result: ") >> fa.trace
    case Errored(e)    => IO.println("Fiber execution failed with exception: "+e) 
    case Canceled()    => IO.println("Fiber operation got cancelled")
}
``` 
## IO Cancellation
One of the most powerful features of a fiber is the ability to cancel its execution. We can invoke `cancel` method on the fiber handle to cancel an ongoing fiber. Let's look at it with an example code:

```
val fiberCancellation = for {
  fiber <- io.start
  _ <- IO.sleep(400.millis) >> fiber.cancel
  result <- fiber.join
  _ <- result match {
    case Succeeded(fa) =>
      IO.println("Fiber succeeded with result: ") >> fa.trace
    case Errored(e) =>
      IO.println("Fiber execution failed with exception: " + e)
    case Canceled() => IO.println("Fiber operation got cancelled")
  }
} yield ()
``` 
`io` is a long running operation which takes just over 1 second. The fiber is cancelled after 400 millis by invoking the cancel method on the fiber handle. The above code will print the output as *Fiber operation got cancelled*. 

We can also attach a cancel hook to an IO using *onCancel()*. Let's modify the above example to use *onCancel* instead:

```
val ioWithHook = io.onCancel(IO("Finaliser for IO Fiber cancellation executed").trace.void)
  val fiberCancellationV2 = for {
    fiber <- ioWithHook.start
    _ <- IO.sleep(100.millis) >> fiber.cancel
    result <- fiber.join
} yield result
``` 
Instead of invoking starting fiber on `io`, we are creating a new IO `ioWithHook` with *onCancel* hook applied. A fiber is initiated for this IO. When the fiber gets cancelled, it invokes the *onCancel* hook/finaliser. 
**Please note that `io.onCancel()` creates a new IO type with the hook attached and on the original `io`, this will not have any impact.**

## Conclusion
In this part, we looked at Cats Effect 3 Fibers and related APIs. Fibers are very important concept and many of the advanced concurrent features are using the fibers under the hood for the implementation. The sample code used here is available in [GitHub](https://github.com/yadavan88/cats-effect-intro) under the package *part4*.
