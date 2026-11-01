---
title: "Diving into ZIO Test 'Aspects': Streamlining Cross-Cutting Concerns in Testing"
pubDatetime: 2023-08-20T06:24:51.000Z
description: "Empowering Your Testing Strategy: A Close Look at ZIO Test Aspects for Effortless and Effective Handling of Cross-Cutting Concerns"
tags:
  - "scala"
  - "testing"
  - "zio"
ogImage: "/images/posts/diving-into-zio-test-aspects-streamlining-cross-cutting-concerns-in-testing/a6a99874-58fa-4dd0-9952-a9cda1252d4b.jpeg"
---
## 1. Introduction

Testing is one of the most essential parts of any software development. As a result, developers spend a lot of time writing unit and integration tests to make the code free from errors.

Often, it becomes necessary to address non-functional scenarios within tests, encompassing challenges like managing flaky test cases and executing tests across different environments(OS, CI, Hardware, etc). In many of the testing frameworks, these cross-cutting functionalities typically require manual management alongside the core test logic. This can divert developers' attention, leading to a disproportionate investment of time in setup tasks rather than focusing on the actual test logic.

Fortunately, [***ZIO-test***](https://zio.dev/reference/test/) **tackles these issues by introducing '*Test Aspects*,' designed to handle common cross-cutting scenarios effectively**. In this article, we'll dive into some of the useful test aspects with sample code. I hope that by the end, readers will feel comfortable using these aspects in a variety of situations.

## 2. Concept of 'Test Aspects'

I believe the Test Aspect in ZIO is inspired by *Aspect Oriented Programming*(AOP). AOP is a paradigm that focuses on separating the concerns. This makes the code more modular by separating the cross-cutting features from the actual business logic. We can then add these cross-cutting modules on top of the business logic when needed. This way, functional and non-functional requirements can gel together easily without affecting each other.

In ZIO-Test, we can write the test case logic and then inject different cross-cutting features into an individual or a group of tests with ease. ZIO-Test already provides an implementation for most of the common cross-cutting scenarios like *retries*, *repeats*, *environment selection* etc. Moreover, we can chain multiple aspects together to create a very complex condition.

## 3. Setup

Let's set up the libraries by adding the dependency to the *build.sbt*:

```scala
libraryDependencies ++= Seq(
  "dev.zio" %% "zio" % "2.0.15",
  "dev.zio" %% "zio-test" % "2.0.15" % Test
)
```

## 4. ZIO Test Aspects in Action

Now that everything is ready, let's create a simple test and make sure the setup works as expected:

```scala
object ZIOSampleAspectSpec extends ZIOSpecDefault {
  override def spec = suite("ZIOSampleAspectSpec")(
    test("a simple zio effect test without any aspect") {
      val zio = ZIO.succeed("Hello ZIO!")
      println("Inside test")
      assertZIO(zio)(Assertion.equalTo("Hello ZIO!"))
    })
}
```

When we run this test, it should print the statement "*inside test"* and pass. Now let's repeat the test multiple times to ensure that it is passing always. In [ScalaTest](/posts/mastering-scalatest-exploring-tagging-retry-runner-and-more/), we normally do that by using [Fixtures](/posts/mastering-scalatest-exploring-tagging-retry-runner-and-more/#heading-retry-tests). However, we need to write some boilerplate code and also add tags to perform the retry. As more and more cross-cutting features are needed, it becomes coupled with the actual test logic.

In ZIO Test, we can extend a test with test aspects simply by using *@@* separator at the end of the test. This way, we don't need to mix-up the test case logic with these non-functional features.

### 4.1. Repeat Test

We can repeat a test multiple times to ensure that the test passes always. Let's add the repeat functionality to the above case:

```scala
test("a simple zio effect test without any aspect") {
  val zio = ZIO.succeed("Hello ZIO!")
  println("Inside test")
  assertZIO(zio)(Assertion.equalTo("Hello ZIO!"))
} @@ repeat(Schedule.recurs(4))
```

At the end of the test, we added the schedule to repeat the tests using `@@ repeat(Schedule.recurs(4))`

Now, when we run the test, we can see that the test is run 5 times. That's it!

### 4.2. Retry Failed Tests

Similar to repeat, we can retry tests. Repeat re-runs of successful tests, whereas retry re-runs tests in case of a failure. This is good to execute flaky tests.

We can use the method *retry* in zio-test to retry the failing test:

```scala
test("retries in case of a failure") {
  for {
    num <- ZIO.succeed(scala.util.Random.nextInt)
    _ = println("number is : "+num)
    isEven = num % 5 == 0
  } yield assertTrue(isEven)
} @@ retry(Schedule.recurs(4))
```

This test retries a maximum of 4 times to check if the test passes. If it fails all 4 retries, then the test is considered a failure.

### 4.3. *flaky* and *nonFlaky*

Sometimes we have flaky tests that fail randomly. We can mark them as *flaky*, so that zio-test runs them multiple times until it is succeeded. By default, it runs the test 100 times and if it fails every time, then only mark the test as a failure:

```scala
test("execute a flaky test") {
  for {
    zio <- ZIO.succeed("hello")
  } yield assertTrue(zio == "hello")
} @@ flaky
```

This runs the test a configured number of times(100 times by default) until it succeeds for the first time. We can also provide a specific number of retries by using `flaky(10)`.

Similarly, we can also ensure that a test is not flaky and it passes all the time by using the aspect *nonFlaky*:

```scala
test("execute a NON flaky test") {
  for {
    zio <- ZIO.succeed("hello")
  } yield assertTrue(zio == "hello")
} @@ nonFlaky
```

You can add a *println* statement within the for-comprehension to see that the test is executed 100 times. Here also, we can explicitly specify a number to rerun by `nonFlaky(8)`.

### 4.4. *before* and *after*

We can execute a piece of code before and after the test using the aspects *before* and *after*:

```scala
test("before and after aspect") {
  for {
    zio <- ZIO.succeed("hello")
    _ = println("before and after")
  } yield assertTrue(zio == "hello")
} @@ before(Console.printLine("Before the test")) @@ after(
  Console.printLine("after the test")
)
```

Here, we attached a block of code to be run before the test and after the test. This is similar to the *before()* and *after()* methods in the ScalaTest. **However, in this case, the before and after code is executed only for this particular test, not for other tests in this suite**.

***If we want to execute the same block before each of the tests, then we need to attach it to the suite level, and not the individual test level.*** Attaching the *before* and *after* aspect at the suite level is equivalent to the *beforeEach* and *afterEach* methods in ScalaTest.

Similarly, we can use *beforeAll* and *afterAll* aspects to execute the code before and after the execution of an entire suite:

```scala
suite("suite"){
 // multiple tests inside suite .... 
} @@ beforeAll(Console.printLine("this is beforeAll"))
```

### 4.5. timeout

We can verify that a test completes within a specified time using *timeout* aspect. If the test takes more time than configured, then the test is marked as a failure. This is very efficient to check the performance of particular methods:

```scala
test("checks performance using timeout") {
  // Thread.sleep(1100) // uncomment this line to see failure
  assertTrue(true)
} @@ timeout(1.second)
```

### 4.6. timed

We can log the time taken for each test by using the aspect *timed*:

```scala
test("show the time for this test") {
  assertTrue(true)
} @@ timed
```

### 4.7. Filter by Environment

We can filter some tests to be run only on particular environments. There are multiple in-built aspects provided by zio-test. For example:

```scala
test("dont run this test in jvm") {
  assertTrue(true)
} @@ jsOnly
```

This aspect makes the test to be run only in javascript environment. In other environments (such as jvm), it ignores this test. Similarly, there are flags like *jvmOnly, nativeOnly, scala2Only etc.*

Additionally, we can execute tests based on the values set in the system environment. The aspect *ifEnv* executes a test only if the provided environment value is set. This is very useful in running tests differently in different systems(for example, Linux CI system, MacC CI system etc).

### 4.8. Chaining multiple aspects

ZIO Tests lets us chain multiple aspects together. This is very helpful in creating a complex test setup.

Let's look at an example of chaining:

```scala
test("a chained test") {
  println("inside chained test")
  Thread.sleep(1000)
  assertTrue(true)
} @@ repeat(Schedule.recurs(3)) @@ after(
  Console.printLine("after in chained")
)
```

In this case, we used *repeat* and *after* aspects together. It repeats the same test 3 times and only after all the repeat, the after aspect is executed.

***Here, we need to be very clear while chaining the aspects. The meaning of the aspects changes if the position is different***. If we rewrite the above test by swapping those 2 aspects, we can see a different result:

```scala
test("a swapped chained test") {
  println("inside chained test")
  Thread.sleep(1000)
  assertTrue(true)
} @@ after(
  Console.printLine("after in swapped chained")
) @@ repeat(Schedule.recurs(3))
```

If we run this test, we can see the println "*after in swapped chained"* got printed 4 times. This is because the after aspect is first applied to the test, and then the repeat got applied to the combined test(with after).

So, we should be careful while aspects are chained.

## 5. Conclusion

In this article, we looked at "Test Aspects" in ZIO Test. We discussed different useful aspects of this library. We also touched upon the chaining feature of aspects and how it can change the behaviour depending on the order of chained aspects.

The sample code is available [on GitHub](https://github.com/yadavan88/blog-code-samples/tree/main/scala3/src).
