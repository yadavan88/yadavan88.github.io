---
title: "Tuple Improvements in Scala 3"
pubDatetime: 2022-11-06T06:00:42.000Z
description: "New changes introduced in Scala 3 for Tuples"
tags:
  - "programming-blogs"
  - "scala"
  - "tuples"
  - "scala3"
  - "scala-basics"
ogImage: "/images/posts/tuple-improvements-in-scala-3/NrcZtPMfX.jpg"
---
> Scala 3's enhanced Tuple datatype enables element access by position, supports tuples comprising beyond 22 elements, and introduces supplementary methods and combinators, ultimately improving user experience.

## Introduction

*Tuple* is a special type of datatype in Scala that helps to store heterogeneous data. All other collections, such as *Array*, *List*, and *Set* store homogenous data.

In Scala 2, the Tuple has very limited methods and operators. Also, there was a limit of 22 elements in a tuple. However, in Scala 3 there have been a lot of changes and improvements in *Tuple*.

In this short blog, let's look at the improvements added in *Tuple*.

## Scala 2 Tuple Limitations

As already mentioned in the previous section, the Scala 2 tuples have some limitations.

### Limit of 22 fields.

In the majority of the cases, we might use tuples with much fewer than 22 elements. However, there are still some cases where this becomes a pain. For example, due to this problem, in [Slick](https://scala-slick.org/), we use [Shapeless](https://github.com/milessabin/shapeless) *HList* for handling mapping for tables with more than 22 columns.

The reason for this limit is due to the way tuple is implemented in Scala 2. For each arity of the tuple, there is a case class in Scala as *Tuple1*, *Tuple2*, ..., *Tuple22*.

### Less number of methods/combinators

Since Tuple is literally implemented using a case class under the hood, tuples don't have methods similar to other collections. So, many of the operations that are generally available on all other collections were not available on tuples, making them less useful other than to return multiple values from a method.

## Changes in Scala 3

In this section, let's look at some of the changes introduced in Scala 3 for tuples.

### Accessing Values

In Scala 2, we can access the elements by using the \_1, \_2 and so on. **In Scala 3, we can access the tuple elements by its position**, just like an Array or a List. Let's look at an example:

```scala
val tuple = ("This", "is", "Scala", 3, "Tuple")
assert(tuple(0) == "This")
assert(tuple(3) == 3)
assert(tuple._1 == tuple(0))
```

As seen in the previous example, we can still access the tuple elements in the same way as we do in Scala 2 using \_1, \_2.

**The most important part here is that if we use the index style access, we get the compilation error if we access an invalid index.** This way we can still safely access the tuple elements just like we do in Scala 2, but in an easier and standardized way. If we access an invalid index:

```scala
tuple(9)
```

We will get the compilation error as:

```scala
[error] 10 |        tuple(9)
[error]    |             ^
[error]    |      Match type reduction failed since selector  EmptyTuple.type
[error]    |      matches none of the cases
```

### More than 22 elements

Scala 3 tuples support tuples with an arity of more than 22. In Scala 3, the 22+ tuples are implemented using a new type *TupleXXL*. But this is completely transparent to the developer and he/she can use small or big tuples in the same way and without the need for other libraries like *Shapeless*.

### More combinators/methods

In scala 3, many more methods are added to the tuple type. A lot of the familiar operators from collections are now available for tuples as well. This makes is much easier for the developers to understand and use tuples. Let's look at some of the useful methods:

```scala
// csv data for tv series data
// SL No, Series Name, Lead Actor, Lenght, IMDB Ratings
val csvRow = (1, "Sherlock", "Benedict Cumberbatch", 72, 8.9d)
assert(csvRow.head == 1) //head to get 1st element
assert(csvRow.last == 8.9d)
assert(csvRow.take(2) == (1,"Sherlock"))
assert((1,2,3).zip("A", "B", "C") == ((1,"A"),(2,"B"),(3,"C")))
assert((1,2,3).toList == List(1,2,3))
```

## Conclusion

In this short blog, we looked at some of the changes introduced in Scala 3 for tuples. The sample code used here is available [here on GitHub](https://github.com/yadavan88/blog-code-samples/tree/main/scala3/src/main/scala/com/yadavan88/tuples).
