---
title: "Tagged Types in Scala"
pubDatetime: 2022-04-05T12:15:01.000Z
description: "Programming languages utilize the concept of Tagged Type to enhance type safety and mitigate common errors. While not a standard library feature, Scalaz, Shapeless, and Scala-Common offer their..."
tags:
  - "scala"
ogImage: "/images/posts/tagged-types-in-scala/3BowjJQ15.png"
---
> Programming languages utilize the concept of Tagged Type to enhance type safety and mitigate common errors. While not a standard library feature, Scalaz, Shapeless, and Scala-Common offer their own implementations. Other options for Tagged Type consist of Case Classes, Value Classes, Opaque Type Aliases, and the refined library.

## What is Tagged Type?

Tagged Type is a concept used in programming languages to enrich the type and avoid some common mistakes. For example, assume that we have a method which takes 2 String parameters, *userId* and *name*:

```scala
def printInfo(userId: String, name: String) = {
    println(s"HEY, userId: $userId and name:$name")
}
```

While invoking the *printInfo* function, if we accidentally provide name in place of userId and vice versa, the compiler will not show any error as the syntax is correct.

So we can call the function as:

```scala
printInfo("user234", "Yadu Krishnan")
printInfo("Yadu Krishnan", "user234")
```

To avoid such mistakes, tagged types come in handy. **The main advantage is that the add-on type it is erased after compilation, so that only the underlying original type will exist in the runtime. This will reduce the runtime overhead, but provide safety at compile time.**

## How to Use Tagged Type in Scala?

Tagged types are not available in Scala standard library. Many libraries like *Scalaz*, *Shapeless*, [*Scala-Common*](https://github.com/softwaremill/scala-common), etc have their own implementation. Here, let's look at how we can use Shapeless implementation of Tagged Type.

Shapeless provides the method *tag* to mark a type with additional information. We create empty traits to tag a type first.

```scala
trait UserId
trait Name
```

Now let's modify *printInfo()* function to use tagged types instead of String:

```scala
def printInfo(userId: String @@ UserId, name: String @@ Name) = {
    println(s"HEY, userId: ${formatString(userId)} and name:${formatString(name)}")
}
def formatString(str: String) = s"`${str}`"
```

Here, *userId* parameter is having the type *String@@UserId* and *name* is of type *String@@Name*. The type on the left side of @@ is the original type. Now, let's see how we can invoke the function:

```scala
val userId = tag[UserId][String]("user234")
val name = tag[Name][String]("Yadu Krishnan")
printInfo(userId, name)
```

If we try to call the method with wrong parameter, it will show compilation error:

```scala
printInfo(name, userId) // compilation error
printInfo("hey","heyhey") // compilation error
```

We can directly use this tagged type where the underlying type is needed. For example, the method *formatString()* in the previous code sample takes a parameter *String*. Without any transformation, we can directly call *formatString(userId)*. Full code sample is available in Github as a [gist](https://gist.github.com/yadavan88/a66b338294cd4633ae3fce486876c26c).

## Drawbacks

Since tagged type is not available in the standard library, each libraries implements its own version. So there is no standard or interchangeable version for this approach.

## Alternatives

There are some alternatives in Scala for Type Tagging. But each one has its own advantages and disadvantages. Depending on the situation, we can select the best way to handle such scenario(including the usage of @@ if you are already using a supporting library)

Some of the alternatives that can be checked are:

* Using Case Classes instead of simple types
    
* Using [Value Classes](https://docs.scala-lang.org/overviews/core/value-classes.html)
    
* Using [Opaque Type Alias](https://github.com/yadavan88/opaque-type-sample) in Scala-3
    
* Slightly different scenario, but can consider [refined](https://github.com/fthomas/refined) library.
