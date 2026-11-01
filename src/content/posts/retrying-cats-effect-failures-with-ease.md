---
title: "Retrying Cats Effect Failures With Ease"
pubDatetime: 2022-06-22T04:30:01.000Z
description: "Learn how to create a customized retry policy with error handling using the Cats-Retry library. Discover the various methods like retryingOnSomeErrors and retryingOnFailures, that enable users to..."
tags:
  - "scala"
  - "functional-programming"
  - "cats"
  - "cats-effect"
ogImage: "/images/posts/retrying-cats-effect-failures-with-ease/xHZAfTE9_.png"
---
> Learn how to create a customized retry policy with error handling using the ***Cats-Retry*** library. Discover the various methods like retryingOnSomeErrors and retryingOnFailures, that enable users to retry an API call when encountering exceptions or non-desired values. Additionally, explore the process of combining multiple retry policies to create a personalized one and setting up the library for seamless use.

## Introduction

We all have worked with services which may fail and we need to retry them at a later point in time. In this blog, let's look at how we can retry failed IOs in the [Cats Effect](/tags/cats-effect/) very easily.

## Simple Approach

Let's assume that we have a REST API which invokes a third-party authentication service. Due to some reason, if the service is not available when we invoke, we need to retry again. Let's also simulate some error conditions for this blog.

Let's first add a mock implementation of this service call:

```scala
def requestAuthToken: IO[String] = {
    val url = "http://localhost:9000/app/authenticate"
    IO.defer {
      // make the http request
      println("making the http request")
      val random = Random.nextInt(500)
      if (random != 0) {
        println("uh oh.. this will fail... " + random)
        Random.nextBoolean() match {
          case b if b => IO.raiseError(new Exception("Serious exception"))
          case _      => IO.raiseError(new IOException("Connection exception"))
        }
      } else {
        println("received response successfully")
        IO(UUID.randomUUID().toString())
      }
    }
 }
```

Now, we can add a basic logic to retry this REST invocation on failure. We can add this as an extension method for easier usage:

```scala
object IORetryExtension {
  implicit class Retryable[A](io: IO[A]) {
    def simpleRetry(noOfRetries: Int, sleep: FiniteDuration): IO[A] = {
      def retryLoop(times: Int): IO[A] = {
        io.map(identity).handleErrorWith { case ex =>
          if (times != 0) {
            println("Will retry in " + sleep)
            IO.sleep(sleep) >> retryLoop(times - 1)
          } else {
            println(
              "Exhausted all the retry attempts, not trying anymore now...."
            )
            IO.raiseError(ex)
          }
        }
      }
      retryLoop(noOfRetries)
    }
  }
}
```

That's it, now we can apply the retry mechanism to our API call:

```scala
requestAuthToken.simpleRetry(5, 500.millis)
```

This will keep retrying the API call every 500 milliseconds.

This is easy, however, there may be cases where we need to provide additional retry mechanisms like delayed retries or handling different errors differently. We will need to add all these to our `simpleRetry` method making it quite complex.

Enters, `cats-retry` - a very small and powerful library which makes the retry mechanism for monads much easier.

## Cats-Retry

[Cats-Retry](https://cb372.github.io/cats-retry/docs/index.html) is a small library which provides many standard retry mechanisms and we can very easily use them. It also allows us to combine multiple retry policies and create a customised one for our needs.

Cats-Retry mechanism supports cats, cats-effect and monix. However, for this blog, we will be using Cats Effect(v3) *IO* for our examples.

### Set-Up

To use this library, we can add the dependency as:

```scala
 "com.github.cb372" %% "cats-retry" % "3.1.0"
```

Now, we can add the following import statement to bring all the necessary methods into scope:

```scala
import retry._
```

## Usage

Now, let's see how we can apply this library to our previous scenario.

To apply retries, we need to do 3 steps:

* Create a retry policy - here we will provide the properties such as no of retries, duration etc
    
* Create an error handler function - which essentially just log the progress and messages
    
* Apply the retry logic to the IO
    

To be more clear, let's convert our previously created simple retry mechanism using *cats-retry* library.

Firstly, we need to create a retry policy to support 5 retries with 500 millis gap between them. By default, cats-retry doesn't provide an in-built policy for the exact requirement above. However, it gives 2 separate policies; for a number of retries and the time duration. We can combine them to create the required policy. Let's look at them step-by-step:

### Create Retry Policy

```scala
val retryPolicyWithLimit = RetryPolicies.limitRetries[IO](5)
val retryPolicyWithDelay = RetryPolicies.constantDelay[IO](500.millis)
val limitWithDelayPolicy = retryPolicyWithLimit.join(retryPolicyWithDelay)
```

Here, we have combined two retry policies using the method `join`. If we add the cats implicit below, we can use the symbol `|+|` in place of `join`:

```scala
import cats.implicits._
val limitWithDelayPolicySymbol = retryPolicyWithLimit |+| retryPolicyWithDelay
```

**Please note that we are using *IO* monad here. If we miss out on providing any type parameter, then we will be getting compilation errors for ambiguous implicits.**

### Create Error Handler Function

Now, let's create a logger function to log the information. This function will take the *Throwable* and *RetryDetails* as input and return an *IO*.

```scala
def onErrorFn(e: Throwable, details: RetryDetails) = {
    details match {
      case ret: RetryDetails.WillDelayAndRetry =>
        IO.println("error occurred..... " + details)
      case GivingUp(totalRetries, totalDelay) =>
        IO.println("done... i will not retry...")
    }
}
```

Here, *RetryDetails* contains the information for scheduling the next retry.

### Apply on the API

Now, let's use the above code and link it to the API call method:

```scala
val retryWithErrorHandling =
    retryingOnAllErrors(limitWithDelayPolicy, onErrorFn)(requestAuthToken)
```

That's it, now we can run this code just like any other Cats Effect app by using IOApp.Simple:

```scala
override def run: IO[Unit] = retryWithErrorHandling.void
```

This library also provides some syntactic sugars using extension methods to make our lives easier. For that, we need to add the import:

```scala
import retry.syntax.all._
```

We can re-write the `retryWithErrorHandling` implementation by *invokingretryingOnAllErrors* method on *IO* as:

```scala
val retryWithErrorHandlingSugar =
    requestAuthToken.retryingOnAllErrors(limitWithDelayPolicy, onErrorFn)
```

## Other Retry Policies

We looked at `limitRetries` and `constantDelay` policies in the previous example. Cats-Retry provides more policies and combinators. Let's look at some of the popular ones here.

### ExponentialBackoff

We can apply an exponential backoff algorithm to the retry duration as:

```scala
val exponentialBackOff = RetryPolicies.exponentialBackoff[IO](1.second)
```

### FibonacciBackOff

We can use Fibonacci backoff algorithm for retry duration as:

```scala
val fibonacciPolicy = RetryPolicies.fibonacciBackoff[IO](1.seconds)
```

### MapDelay

We can apply an additional delay to a policy by using *mapDelay*. For example, we have created a `retryPolicyWithLimit` which will retry 5 times. We combined it with `limitWithDelayPolicy` using the `join` method to create the combination we need. We can apply the delay duration to `retryPolicyWithLimit` using the *mapDelay* method instead:

```scala
val limitWithDelayPolicyMapped = retryPolicyWithLimit.mapDelay(_ + 2.second)
```

This will create a new policy, which will retry 5 times with 2 second delay in between.

### FollowedBy

The join method will merge 2 policies and create a single policy. We can apply multiple policies sequentially using `followedBy` combinator:

```scala
val followUpRetryPolicy = limitWithDelayPolicy.followedBy(RetryPolicies.fibonacciBackoff(1.seconds))
```

This will apply the `limitWithDelayPolicy` to the IO. Once the retry fails in all attempts, then it will apply the second policy, which is `fibonacciBackoff`. This way, we can prioritise and apply different policies one after another.

## Combinators

In all our previous examples, we used `retryingOnAllErrors` to apply the retry function. This method will retry if the IO has failed with a *Throwable* and apply the error handler function to the result. Cats-Retry library provides more such combinators to handle different scenarios. Let's look at some of them below.

### RetryingOnSomeErrors

Instead of retrying on all errors, we can apply the retry mechanism to some of the exceptions. For this, we can use the method `retryingOnSomeErrors`. This will take another parameter which will decide whether to retry or not. For example, in our API call, we want to retry only for *IOExceptions* and not for anything else. So we can write a function to apply this logic:

```scala
def canRetryRequest(e: Throwable) = {
    e match {
      case _: IOException => IO.println("Can retry this one...") >> IO(true)
      case _              => IO.println("No point in retrying") >> IO(false)
    }
}
```

Now, we can use this method in *retryingOnSomeErrors* as:

```scala
val retryWithSomeErrors =
    retryingOnSomeErrors(limitWithDelayPolicy, canRetryRequest, onErrorFn)(
      requestAuthToken
    )
```

Now, this will retry the API call only if *requestAuthToken* fails with IOException. For any other exceptions, it will not be retried.

### RetryWithSomeFailures

So far, we have applied retries on receiving an exception. Sometimes, we need to retry when a non-desired value is received (which is not an exception). In such case, we can use the method `retryWithSomeFailures`.

To discuss this, we can use a different scenario. A person wants to retry writing an exam if he/she has failed in the previous attempt. Here, failure means the person has received less than 60% marks in the exam. So, we can create a method to check if he/she has passed the exam:

```scala
def isPassed(mark: Int) = {
    IO.delay(mark > 60)
}
```

We also have the method by which the person actually takes the exam:

```scala
 def takeExam: IO[Int] = {
    IO.delay(Random.nextInt(100))
}
```

Now, let's apply these together:

```scala
val retryWithSomeFailures =
    retryingOnFailures(limitWithDelayPolicy, isPassed, failureLogger)(takeExam)
```

Now, the method *takeExam* will be retried if *isPassed* returns false. Otherwise, the retry will not be applied.

### Other Combinators

Similar to the above, this library provides more combinators which follow more or less the same approach. The syntax for these combinators is available on the [website](https://cb372.github.io/cats-retry/docs/combinators.html).

## Conclusion

In this article, we looked at retry functionality using cats-retry. The code samples used here is available on [GitHub](https://github.com/yadavan88/cats-effect-retry-example). It is really an amazing library which provides a lot of flexibility. I hope that this was useful to you. Please feel free to leave comments if any improvements are needed.
