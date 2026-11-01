---
title: "Effective Test Parameterization with ScalaTest Tables"
pubDatetime: 2023-11-23T21:08:12.000Z
description: "Make your tests more readable and maintainable using Table Driven testing in Scalatest"
tags:
  - "scala"
  - "testing"
  - "scalatest"
  - "scala-basics"
ogImage: "/images/posts/effective-test-parameterization-with-scalatest-tables/463ca43f-6e90-4cc0-8daa-4e5cd05f4535.jpeg"
---
## Introduction

To manage the software's quality, it is essential to cover the methods with unit/integration tests. However, writing tests for all the methods/classes is not enough. It is important to write proper tests covering all the edge cases. Otherwise, we might run into problems in strange scenarios.

In Scala, one of the most popular testing libraries is [ScalaTest](/posts/mastering-scalatest-exploring-tagging-retry-runner-and-more/). ScalaTest provides a feature, *Table*, by which we can easily parameterize the test cases.

While working with newbies to Scala, I noticed that many people are not aware of this feature. As a result, we write a lot of boilerplate code in the test when there are many similar cases to test.

In this article, let's look at how we can use ScalaTest's *Table* feature to handle different cases.

## Setup

Firstly, let's add the ScalaTest dependency to the *build.sbt*:

```scala
libraryDependencies += "org.scalatest" %% "scalatest-flatspec" % "3.2.17" % Test
```

In this particular case, we are using *scalatest-flatspec*. However, we can use other flavours such as *Wordspec*, *Freespec*, etc without any difference.

Now let's create a very simple method with some business logic. For this blog, let's write a method that checks if two timezone identifiers have the same time. We can do that by comparing the offset of both identifiers. Let's write a small method that performs this comparison:

```scala
def isSameTimeZoneOffset(zone1: String, zone2: String): Either[String, Boolean] = {
  Try {
    val zoneOffset1 = ZoneId.of(zone1).getRules.getOffset(Instant.now)
    val zoneOffset2 = ZoneId.of(zone2).getRules.getOffset(Instant.now)
    zoneOffset1 == zoneOffset2
  }.toEither.left.map(_ => "Invalid TimeZone")
}
```

## Unit Test

Now that the functionality is ready, we need to write unit test for this method. Let's use ScalaTest and write a test for it:

```scala
"Europe/Paris" should "have the same offset as Europe/Berlin" in {
  assert(
    TimeZoneComparer.isSameTimeZoneOffset(
      "Europe/Paris",
      "Europe/Berlin"
    ) == Right(true)
  )
}
```

This case compares the timezone identifiers *Europe/Paris* against *Europe/Berlin.* Similarly, we should compare different cases to make sure that the code is working fine. We can duplicate the test case and pass different parameters to the method for all the cases.

However, this is unnecessary and creates boilerplate test cases. Also, it becomes difficult to understand what are the cases we already covered.

We can simplify this using parameterized tests in ScalaTest. In the next section, let's look at that.

## Parameterizing the Test

ScalaTest provides a method by which we can easily parameterize the tests. We need to use the data structure called *Table*. For that, we need to mix-in with the trait *TableDrivenPropertyChecks*.

*Table* is essentially like a *M x N matrix* that defines the different possible cases that can be used in the tests. We use tuples to define each row of the table. Please note that the first row is considered as heading row and will not be used in the tests.

Let's write the different cases for the above test in the Table. In our case, we have 2 inputs, namely *zone1* and *zone2* in the method. Similarly, we get a boolean value as a result. So, we use a 3-element tuple to define the inputs and the expected output:

```scala
val timezoneTable = Table(
  ("timezone1", "timezone2", "Is Same Offset"),
  ("Europe/Paris", "Europe/Berlin", Right(true)),
  ("Europe/Paris", "Europe/London", Right(false)),
  ("Europe/Berlin", "Europe/London", Right(false)),
  ("Europe/Bucharest", "Europe/Berlin", Right(false)),
  ("Asia/Kolkata", "Asia/Colombo", Right(true)),
  ("Asia/Kolkata", "Asia/Dhaka", Right(false)),
  ("Europe/Berlin", "Europe/Amsterdam", Right(true)),
  ("wrong-1", "wrong-2", Left("Invalid TimeZone"))
)
```

Now, we can use this table in the test to cover many cases with ease. We use the method *forAll()* from ScalaTest that uses the table we created above and pass individual values to the test.

So, let's modify the test a bit to support this:

```scala
"TimeZoneComparerSpec" should "compare two timezone identifier and check if they have same offset" in {
  forAll(timezoneTable) { (timezone1, timezone2, isSameOffset) =>
    assert(
      TimeZoneComparer.isSameTimeZoneOffset(timezone1, timezone2) == isSameOffset
    )
  }
}
```

This way, we separated the data from the test case. We can add any number of combinations to the table without making changes to the test case.

Moreover, we can very clearly understand the different cases by looking at the table alone.

ScalaTest executes each of the cases individually and marks the entire test as a failure if one of the cases fails.

Let's simply change the input to false for the first case and rerun the test. This causes the test to fail and shows the error message below:

```plaintext
Message: Right(true) did not equal Right(false)
Location: (TimeZoneComparerSpec.scala:21)
Occurred at table row 0 (zero based, not counting headings), which had values (
  timezone1 = Europe/Paris,
  timezone2 = Europe/Berlin,
  Is Same Offset = Right(false)
)
```

It shows where it failed along with the row values.

## Conclusion

In this short blog, we discussed one of the useful features of ScalaTest. Table-based testing provides a powerful and clear way to test methods with multiple scenarios.

The table enhances the readability and separates test data from the test case. Moreover, we can use this as a starting point for writing TDD.

The sample code shown here is available [here](https://github.com/yadavan88/blog-code-samples).
