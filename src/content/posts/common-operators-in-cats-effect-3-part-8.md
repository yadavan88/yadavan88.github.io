---
title: "Common Operators in Cats Effect 3 [Part-8]"
pubDatetime: 2022-05-26T20:18:40.000Z
description: "This is the 8th part of the Cats Effect 3 blog series. In this part, let's discuss about the other common operators/methods available in Cats Effect which were not discussed in the previous parts."
tags:
  - "scala"
  - "functional-programming"
  - "cats-effect"
ogImage: "/images/posts/common-operators-in-cats-effect-3-part-8/DPpps7eAR.jpg"
---
## Introduction

This is the 8th part of the Cats Effect 3 [blog series](/tags/cats-effect/). In this part, let's discuss about the other common operators/methods available in Cats Effect which were not discussed in the previous parts.

## Blocking

As discussed in the previous sections, Cats Effect manages the fibers and allocates them on the threads automatically. Cats Effect manages the threadpool which is used for all these operations. However, sometimes we need to use blocking operations. So instead of using the same threadpool which is used by CE fibers, it is better to use a separate threadpool. We can do that by wrapping the operation in *IO.blocking* block. This will ensure that CE uses a different threadpool for this operation and it won't affect the main CE threadpool.

```scala
val blockingPoolExec = for {
    _ <- IO(s"Hello World, welcome to CE Threadpool!").trace
    _ <- IO.blocking { println(s"[${Thread.currentThread.getName}] This is a blocking call, should run on different threadpool")}
} yield ()
```

Before Cats Effect version 3.3.2, any code wrapped in blocking block will always shift to a new threadpool. However, from 3.3.2 onwards, CE improvised the blocking code to handle separately based on the runtime threadpool. So it is not necessarily shifted to another threadpool, might differ depending on different scenarios. Detailed description can be read [here](https://github.com/typelevel/cats-effect/issues/3005#issuecomment-1134974318).

In the above code example, both the IOs will execute on the same threadpool, as we are using the default threadpool managed by CE. Now, if we change the code to have *evalOn* to use a different threadpool, then we can see that the blocking code is executed in a different threadpool reserved for blocking operations:

```scala
val customThreadPool = scala.concurrent.ExecutionContext.global
val ioOnDiffPool = blockingPoolExec.evalOn(customThreadPool)
```

## IO.interruptible

*IO.interruptible* is similar to *IO.blocking*. But it tries to interrupt the blocking operation if the operation is canceled. In this case, the interruption is attempted only once.

There is another variant as *IO.interruptMany*, which retries the interruption until the blocking operation is completed or terminated.

## Async

Async is a typeclass that provides support for suspending asynchronous operations which is going on in another context. For example, we can switch the future execution result to an IO using async methods. Let's look at it with an example:

```scala
val future = scala.concurrent.Future {
  Thread.sleep(100)
  println(s"[${Thread.currentThread.getName}] Executing the future operation")
  100
}
val asyncIO = IO.async_[Int] { callback =>
  future.onComplete { result =>
    callback(result.toEither)
  }
}
```

In the above code, the execution happening in Future thread is transferred into an IO using the method *async\_* (Notice the \_ in the method). There is another variant *async* which is a more generic version of *async\_*

## IO.attempt

The method attempt converts an *IO* to *Either* based on the result when executed.

```scala
val simpleIO = IO("Hello World!")
val attemptedIO: IO[Either[Throwable, String]] = simpleIO.attempt // becomes Right
val faiureIO = IO.raiseError[String](new Exception("Some exception"))
val attemptedFailureIOn: IO[Either[Throwable, String]] = faiureIO.attempt // becomes Left
```

## IO.option

Similar to attempt, we can convert an *IO\[A\]* to *IO\[Option\[A\]\]* using this method. If the IO executes to a failure, this will replace it with a None.

## Conclusion

In this part, we looked at some of the additional operators in Cats Effect 3. This is the last part of this series. As always, the sample code is available in [GitHub](https://github.com/yadavan88/cats-effect-intro) under the package *part8*. I hope that this series helped atleast some of you out there to get started with Cats Effect 3.
