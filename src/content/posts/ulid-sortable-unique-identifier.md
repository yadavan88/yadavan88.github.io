---
title: "ULID - Sortable Unique Identifier"
pubDatetime: 2023-01-01T07:00:44.000Z
description: "ULID - Sortable Unique Identifier that is better than UUID in many cases. ULID vs UUID"
tags:
  - "uuid"
  - "scala"
ogImage: "/images/posts/ulid-sortable-unique-identifier/cee8b5cd-ebac-46f8-b46b-66b040ceddfb.jpeg"
---
> Learn about **ULID**s, a 128-bit identifier that's lexicographically sortable and making it an ideal alternative to UUIDs for order preserving unique identifiers.

## Introduction

While building software applications, we need to generate random identifiers for many scenarios. In most cases, we use a [UUID](https://en.wikipedia.org/wiki/Universally_unique_identifier) for generating a random identifier, as it is available out of the box in all the programming languages.

However, some of the disadvantages of UUID are:

* Very long string (36 characters long)
    
* No way of identifying the order of generation, hence can't be used where ordering is important such as sharding
    

## ULID - Universally Unique Lexicographically Sortable Identifier

[ULID](https://github.com/ulid/spec) is almost similar to UUID. However, **ULID is lexicographically sortable, unlike UUID**. **ULID uses 26 character format** whereas UUID uses 36 characters.

Some of the features of ULID are:

* 128 bits, which is compatible with UUID
    
* Sortable string
    
* URL Safe as there are no special characters involved
    
* Uses [Crockford’s base-32](http://www.crockford.com/base32.html) for encoding and does not use alphabets I, L, O, and U to avoid confusion.
    

Let's look at the components of a ULID identifier.

The 128 bits of ULID is split into 2 components.

The first part is 48 bits, which represents the timestamp component(UNIX time in milliseconds) and it is encoded using 10 characters.

The second part is the remaining 80 bits which represent the randomness and is encoded using 16 characters.

For example, let's use a ULID identifier `01GNKVTMZ6AW7D1FP7QHQ2E86Y`.

![](/images/posts/ulid-sortable-unique-identifier/883778fb-98df-41f9-b649-3009cbdf6759.png)

The first part is generated based on the [UNIX Epoch Millis](https://en.wikipedia.org/wiki/Unix_time). Hence, the new ULID generated after this will have a different timestamp, but it will be encoded with lexical ordering. That means, we can sort the ULIDs based on the first 10 characters to get it in the order of generation.

The second part is generated with cryptographically strong random generation.

**If more than one ULID is generated within the same millisecond(so, the timestamp component is the same), the algorithm should increment the previously generated random by 1 bit**. This is referred to as [Monotonicity](https://github.com/ulid/spec#monotonicity) and this ensures that the chances of collision of ULIDs within the same millisecond are almost nil. Also, this helps in still providing a reliable sort order within millisecond generation. You may refer to [this link](https://zendesk.engineering/how-probable-are-collisions-with-ulids-monotonic-option-d604d3ed2de) regarding the probability of ULID collision.

However, **in the case of distributed systems, the sort order of ULIDs generated within a millisecond can not be guaranteed**. If ordering is very important in such a distributed system, then it is better to have a ULID generation coordinator. This way all the ULIDs are generated in a single node and hence ordering is guaranteed.

One of the disadvantages of ULID is the lack of RFC. UUID is defined using [RFC-4122](https://www.rfc-editor.org/rfc/rfc4122). However, no such RFC exists for ULID, making it a bit less reliable. Good thing is that there are ULID implementations in most programming languages based on [this spec](https://github.com/ulid/spec).

## Scala Implementation

In this section, let's look at the Scala implementation of ULID spec.

[Airframe](https://github.com/wvlet/airframe) is a set of useful scala libraries for common operations. It also has a ULID implementation as [Airframe-ULID](https://wvlet.org/airframe/docs/airframe-ulid). It follows the ULID spec including the monotonic sort ordering. It is also available for ScalaJs and Scala Native apart from JVM.

We can add the dependency to the *build.sbt* to use this library:

```scala
libraryDependencies += "org.wvlet.airframe" %% "airframe-ulid" % "22.12.6"
```

Now, we can generate the ULID identifiers easily. Let's add the import to generate ULIDs:

```scala
import wvlet.airframe.ulid.ULID
```

We can generate the ULID identifier as:

```scala
val ulid: ULID = ULID.newULID
println(ulid)
println(ulid.epochMillis) // prints the millis at which this ULID is generated
```

We can also generate the ULID as string directly:

```scala
val ulidStr: String = ULID.newULIDString //returns string value
val ulidFromStr: ULID = ULID.fromString(ulidStr) // create ULID instance from string
```

Just for understanding, we can generate multiple ULIDs in a loop and verify if the ordering is preserved:

```scala
val ulids: List[(Int, ULID)] = (1 to 10).toList.map{ i =>
    // Thread.sleep(1)
    (i, ULID.newULID)
}
ulids.foreach(println)
//verify that same ulids are not generated
assert(ulids.map(_._2).toSet.size == 10)
//verify monotonic ordering
assert(ulids.sortBy(_._2) == ulids)
//see if ulids generated within same millisecond
val diffMillis = ulids.map(_._2).map(_.epochMillis).toSet.size
if(diffMillis == 10) {
    println("All ULIDs generated in different milliseconds")
} else {
    println(s"There are some overlapping milliseconds for ULIDs. ${diffMillis} ULIDs generated within same millis")
}
```

We can uncomment the `Thread.sleep(1)` within the ULID generation to verify that there are no ULIDs with the same time component.

We can additionally write a simple property test to verify the monotonic sorting order using `ScalaCheck` library:

```scala
class ULIDTest extends AnyFlatSpec with ScalaCheckDrivenPropertyChecks {
  it should "Check for ULID sorting" in {
    forAll(ULID.newULID, ULID.newULID) { (ulid1, ulid2) =>
      assert(ulid1.<(ulid2))
    }
  }
}
```

## Conclusion

In this blog, we looked at the order preserving unique identifiers using ULIDs. It makes it easier to track and debug the application better than using UUIDs. However, ULIDs expose the timestamp of the generation and if that in any way affects the security of your application, then it is better to avoid ULIDs. The sample code used here is available [here on GitHub](https://github.com/yadavan88/blog-code-samples/tree/main/scala2/src/main/scala/com/yadavan88/ulid).
