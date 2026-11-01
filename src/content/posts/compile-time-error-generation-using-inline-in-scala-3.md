---
title: "Compile Time Error Generation using inline in Scala 3"
pubDatetime: 2022-10-24T06:15:42.000Z
description: "Implementing compile time validation in Scala 3 using inline modifier"
tags:
  - "scala"
  - "macros"
  - "metaprogramming"
  - "scala3"
ogImage: "/images/posts/compile-time-error-generation-using-inline-in-scala-3/W7OtFEphj.jpg"
---
## 1. Introduction

As most of you already know, [Scala 3](https://docs.scala-lang.org/scala3/new-in-scala3.html) has completely redesigned the language and also brought in a lot of new features. As part of it, Scala 3 has implemented meta programming from scratch.

Scala 3 has simplified a lot of common meta programming concepts using the [inline](https://github.com/yadavan88/yadavan88.github.io#inline-modifier-in-scala-3). More advanced logic can be implemented using advanced [macros concepts](https://docs.scala-lang.org/scala3/guides/macros/quotes.html) and the new [reflection api](https://docs.scala-lang.org/scala3/guides/macros/reflection.html).

While I was working on a small module in Scala 3, I thought of trying one of the *inline* features, as I felt it was a nice use-case to learn and implement it. I would like to share this for the readers, as this might come in handy for some of you.

## 2. Scenario

So, here is the scenario I was trying to implement. I want to add validation for an api versioning and fail it at compile time if the user provides the version value in a wrong format. Even though I could have lived with a runtime validation, I thought of giving a try with *Scala 3 inline* modifier.

## 3. Implementation - Step 1

Scala 3 has introduced a new package `scala.compiletime` which allows us to evaluate the inline code and generate compilation time errors. As the first step, I implemented a very basic skeleton based on the sample code available on the Scala 3 documentation website. Here is the initial code, which validates if the version number is positive, otherwise showing a compilation error:

```scala
import scala.compiletime.*

object InlineCompilerError {
  inline def checkVersion(inline versionNo: Int) = {
    inline if (versionNo < 0) {
      error("Invalid version number! Negative versioning is not allowed. "+codeOf(versionNo))
    } else {
      //nothing to do here
      println(s"Correct version information")
    }
  }
}
```

Now, we can invoke this method `checkVersion` with different values and see how the compiler behaves.

First, let's invoke with a number greater than 0:

```scala
checkVersion(1)
```

This will compile successfully, since 1 &gt; 0.

Now, we can try invoking the method with a negative number:

```scala
checkVersion(-1)
```

When we try to compile this code, we immediately get a compilation error with the message:

> Invalid version number! Negative versioning is not allowed. Value of versionNo provided is -1

We are successful in generating an error for invalid numbers at the compilation time itself. Also note that, **the method** `codeOf()` can show the value of the variable, which can add value to the error message.

## 4. Implementation - Step 2

Even though it works, my scenario needed a string value to be passed as the *versionNo*, not a numerical value. So, I tried to modify the same code to take a string as the input and wanted to apply a regex for the semantic version format `x.y.z` with *x*,*y* and *z* as numbers.

So, I modified the above code as:

```scala
inline def checkVersion(versionNo: String) = {
    inline if (!versionNo.matches("[\\d]+\\.[\\d]+[\\.\\d]*")) {
      error("Invalid semantic version number format. Value of versionNo provided is "+codeOf(versionNo))
    } else {
      //nothing to do here
      println(s"Correct version information")
    }
  }
```

Then, I tried to invoke the method with a valid version number:

```scala
checkVersion("1.2")
```

To my surprise, I got a compilation error as below:

> Cannot reduce `inline if` because its condition is not a constant value: "1.2".matches("\[\\d\]+\\.\[\\d\]+\[\\.\\d\]\*").unary\_!

I thought that the value *1.2* is a compile-time constant and it should be able to reduce the inline condition successfully. I tried different methods and approaches but was not able to find a way around them. Then I posted my doubt in the [Scala User Group](https://users.scala-lang.org/t/scala-3-inline-compilation-error/8885). The great people there were able to help me and guide me in the right direction.

I learned that Scala 3 provides another package `scala.compiletime.ops` precisely to handle this scenario. We can import `scala.compiletime.ops.string.*` and use it to implement my requirement. After exploring it a bit in detail, I learned that it provides ways to solve my exact scenario using the type `Matches` which can check if a string is matching a regex.

We can rewrite the above invalid code as:

```scala
import scala.compiletime.*
import ops.string.*

object InlineCompilerError {
  inline def checkVersion(versionNo: String) = {
    inline if (!constValue[Matches[versionNo.type, "[\\d]+\\.[\\d]+[\\.\\d]*"]]) {
      error("Invalid semantic version number format. Value of versionNo provided is "+codeOf(versionNo))
    } else {
      //nothing to do here
      println(s"Correct version information")
    }
  }

}
```

Now, we can try to invoke the method with a valid version number: `checkVersion("14.21.9")`

Voila! It compiles successfully :)

Now, we can try with an invalid version number:

```scala
checkVersion("14.21.x")
```

If we compile this code, it will fail with the error message:

> Invalid semantic version number format. Value of versionNo provided is "14.21.x"

## 5. Other Available Types

Apart from `Matches`, it provides functionality to calculate the length of string, substring and finding a char at an index. The [ops package](https://github.com/lampepfl/dotty/tree/main/library/src/scala/compiletime/ops) also contains classes for *int*, *double*, *any*, *float*, *long* and *boolean* types.

## 6. Conclusion

In this blog, I wanted to share some new information I learned about the `inline` functionality in Scala 3. Even though the ops package doesn't have very extensive operations, it still helps to implement some nice features. Probably, more such operations will be added in future releases. The sample code used here is available over on [GitHub](https://github.com/yadavan88/blog-code-samples).
