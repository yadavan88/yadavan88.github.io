---
title: "Mastering ScalaTest - Exploring Tagging, Retry, Runner and More"
pubDatetime: 2023-06-23T20:48:18.000Z
description: "How to tag tests, retry flaky tests, runners, compile check etc in ScalaTest framework"
tags:
  - "unit-testing"
  - "programming-blogs"
  - "scala"
  - "scalatest"
ogImage: "/images/posts/mastering-scalatest-exploring-tagging-retry-runner-and-more/30a788e8-2403-4899-bed5-4fa6b043fd1e.jpeg"
---
## Introduction

[ScalaTest](https://www.scalatest.org/) is one of the most popular and oldest testing libraries in Scala. As a result, it is used by a huge majority of the Scala codebase.

Other popular testing frameworks are *MUnit*, *uTest* and so on.

In this blog, I would like to take you through some of the nice features of the ScalaTest which newcomers find a bit confusing in the beginning.

Note that I am NOT planning to cover [*Matchers*](https://www.scalatest.org/user_guide/using_matchers) as part of this article, but maybe as another article in future if it makes sense.

## Set-Up

We can set up the required libraries in *build.sbt*:

```scala
libraryDependencies ++= Seq(
  "org.scalatest" %% "scalatest-flatspec" % "3.2.16" % Test
)
```

ScalaTest has many different testing styles. However, this is also one of the complaints about it. I mostly use *WordSpec* or *FlatSpec* style.

For this article, I am using the *FlatSpec*.

## Tagging

ScalaTest allows us to use tagging to group a set of tests. We can then execute only those tests by tags. This is very useful in separating different types and executing them in the CI pipeline. For example, we can create tags for Db-related tests, 3rd party API dependent tests and so on.

Let's look at how we can tag a test. We can create tags by extending with `Tag` :

```scala
object NumericTag extends Tag("Numeric")
object StringTag extends Tag("Str")
```

Now, we can write a simple test to use these tags:

```scala
class TaggingSampleSpec extends AnyFlatSpec {
  it should "calculate square of a number" taggedAs NumericTag in {
    val num = 10
    val square = num * num
    assert(square == 100)
  }
}
```

In the above test, we used `taggedAs NumericTag` to tag this test. Similarly, let's add a 2 more tests:

```scala
it should "calculate square of a number without tagging" in {
  val num = 10
  val square = num * num
  assert(square == 100)
}
it should "concatenate 2 string values" taggedAs StringTag in {
  assert("a" + "b" == "ab")
}
```

Here, we added two more tests, one tagged as `StringTag` and another without any tags.

We can execute all the tests in this class as:

```scala
sbt "testOnly *TaggingSampleSpec"
```

However, since we have tagged some of the tests, we can run only those with a particular tag:

```scala
sbt "testOnly *TaggingSampleSpec -- -n Str"
```

Here we are selecting to run tests that are tagged by `StringTag` using `-n`. **Note that we should provide the tag name and not the tag object to run the tests**.

Similarly, we can also exclude tests by a tag by using. `-l`:

```scala
testOnly *TaggingSampleSpec -- -l "Str"
```

This will run all tests which are not tagged as `StringTag`.

Moreover, we can assign multiple tags to a test:

```scala
it should "calculate square of a number" taggedAs (NumericTag, StringTag) in {
  val num = 10
  val square = num * num
  assert(square == 100)
}
```

This means that the above test is tagged as both `NumericTag` as well as `StringTag`.

We can also run multiple tags by providing as many `-n` options as we want:

```scala
sbt "testOnly *TaggingSampleSpec -- -n Str -n Numeric"
```

This runs all tests that are tagged as either `StringTag` or `NumericTag`.

## Tagging Using Annotation

Instead of creating an object, we can also create tags using annotations. However, we need to use Java annotation to create the tags.

To do that, we create an annotation and annotate it with `@TagAnnotation`. Let's look at an example:

```scala
@TagAnnotation
@Retention(RetentionPolicy.RUNTIME)
public @interface SpecialTest {
}
```

Now that we created annotations, we can use them in the test:

```scala
@SpecialTest
class TaggingAnnotationSpec extends AnyFlatSpec {
  it should "pass this test" in {
    succeed
  }
  it should "pass this test as well" in {
    succeed
  }
  it should "again pass" in {
    succeed
  }
}
```

We annotated the test class using `SpecialTest` annotation. **This means that all the tests within this class will be automatically tagged with this annotation**. We don't need to explicitly tag each of the test cases.

However, **while we execute the test by tag, we need to provide the full path of the tag annotation**(not just the name):

```scala
sbt "testOnly *TaggingAnnotationSpec -- -n com.yadavan88.tags.SpecialTest"
```

## Retry Tests

Sometimes we might have flaky tests that fail on the first attempt due to different reasons. But they might pass again in the next run. However, the CI pipeline fails due to this flakiness and we are forced to rerun the whole pipeline.

ScalaTest provides a way to retry such flaky tests and mark them as failed only if it is repeatedly failed. To implement this, we can extend our test class with the trait `Retries` and provide a *Fixture* implementation to decide on the number of retries.

Let's look at an example where we allow a maximum of 5 attempts before a test is considered as failed. Let's first extend the class with `Retries` trait and set a max retry count:

```scala
class RetryWithTaggingSpec extends AnyFlatSpec with Retries {
  val maxRetryCount = 5
}
```

Next, we need to override a fixture method `withFixture` and setup the retry functionality:

```scala
override def withFixture(test: NoArgTest): Outcome = {
  if (isRetryable(test)) {
    withRetry(withFixture(test, maxRetryCount))
  } else super.withFixture(test)
}
def withFixture(test: NoArgTest, count: Int): Outcome = {
  val outcome = super.withFixture(test)
  outcome match {
    case Failed(_) | Canceled(_) =>
      if (count == 1) super.withFixture(test)
      else withFixture(test, count - 1)
    case other => other
  }
}
```

Notice that only the first method has `override` keyword. The second method is our custom method which keeps track of the number of attempts completed and exits after reaching the maximum retries. We retry the tests only if the status is *Failed* or *Canceled*.

**This will retry all the tests that are tagged as *Retryable*, at most 5 times**.

Now, let's write a test case to try out:

```scala
var count = 0
it should "retry this test 3 times and then pass" taggedAs Retryable in {
  count = count + 1
  if (count == 3) succeed
  else {
    println("this is failure")
    assert(false)
  }
}
```

This test fails on the first two attempts and on the third attempt, it passes. When we execute this test, we can see that the statement `this is failure` got printed twice but the test has passed.

**Instead of explicitly tagging the test, we can tag all the tests as** `Retryable` **by using the annotation** `@Retryable`. This way, we also don't need to extend with `Retries` trait:

```scala
import org.scalatest.tags.Retryable
@Retryable
class RetryWithAnnotationSpec extends AnyFlatSpec {
// ....
  // fixtures same as before 
  it should "[Retryable annotation] retry this test 3 times and then pass" in {
    //.... same as prev case, notice there is no tagging here 
  }
}
```

## Compilation Check

Many times, we create our DSLs in Scala. Hence we generally need to verify that a set of code follows the rules correctly and compiles as expected.

We can verify if a code block as text compiles successfully. Let's look at an example:

```scala
object DSL {
  def fancy = "fancy dsl impl"
}
it should "check if a code block compiles" in {
  assertCompiles("""DSL.fancy""")
}
```

The `assertCompiles` method verifies if the passed-in text is a valid Scala code block and fails the test if it is not valid.

Similarly, we can also verify that a code block should not compile:

```scala
it should "verify a code block doesnt compile" in {
  assertDoesNotCompile("""DSL.fancyNew""")
}
```

## ScalaTest Runner

ScalaTest has very rich runner commands. Using it, we can execute the tests in multiple ways. We already saw the `-n` and `-l` flags to execute by tag name.

Similarly, here are some of the very useful commands that can be used with ScalaTest:

| Command | Description |
| --- | --- |
| testOnly \*RetryWithTaggingSpec | Runs only test class name that ends with RetryWithTaggingSpec |
| testOnly \*TaggingSampleSpec -- -z "calculate square" | Runs all tests from TaggingSampleSpec that contains the text `calculate square` as part of test name |
| testOnly -- -m "com.yadavan88.scalatestdemo" | Run all tests in the (exact)package `com.yadavan88.scalatestdemo` |
| testOnly -- -w "com.yadavan88" | Run all the tests of package `com.yadavan88` and all its sub-packages |

## Conclusion

In this article, we discussed some of the features of the ScalaTest. I hope this was useful to you. There are tons of other features in ScalaTest that are not covered here.

The code samples used here are available on [GitHub](https://github.com/yadavan88/blog-code-samples/tree/main/scala3/src). Please leave a reaction or comment if this was useful. Please feel free to provide any suggestions for intriguing blog topics that you'd like to explore.
