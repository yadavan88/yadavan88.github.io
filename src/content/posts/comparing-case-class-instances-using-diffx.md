---
title: "Comparing case class instances using DiffX"
pubDatetime: 2023-03-04T13:15:01.000Z
description: "Compare instances of scala case classes and identify differences with ease."
tags:
  - "scala"
  - "testing"
ogImage: "/images/posts/comparing-case-class-instances-using-diffx/8766f966-341a-4603-9c0b-c5141134e2df.png"
---
> Diffx is the ideal tool for comparing intricate data structures, even those with nested case classes. Its user-friendly APIs, customization features, and effortless integration with testing libraries have made it a favourite among developers. With the option to set an epsilon value, it can compare fields with minor differences. Additionally, setup and usage instructions are available to ensure a smooth and straightforward experience.

## Introduction

Recently I wanted to implement a test feature where I have to compare 2 deeply nested and complex data structures. While trying to find a good and easy solution for it, I came across this small and useful library called [Diffx](https://github.com/softwaremill/diffx).

In this article, I want to show some of the nice features of this library for comparing complex data structures with ease.

## Simple Implementation

In my previous tasks, I used to write simple methods by myself to compare and show differences in data as part of tests. There might be some fields which are auto-generated or timestamp fields. Hence, we can't directly compare 2 instances of the same case class as there will be differences.

Let's use a very simple case class to explain the scenario:

```scala
case class Account(name: String, accountNo: String)
case class Transaction(id: String, amount: Int, from: Account, to:Account, created: LocalDateTime)
```

One approach to overcome this problem is as below:

Adding some methods within the case class to reset the value or setting a default value for comparison purposes. For example, in `Transaction`, the `id` field might be using a UUID, which becomes difficult to compare. So we can write a method as `def withDummyId() = this.copy(id = "UUID")`. Now the comparison works fine in the test. However, we either need to add this method within the case class or add it as an extension method.

However, it becomes very cumbersome if the data structure becomes more complex with multi-level nesting. **It becomes even more difficult if the comparison needed is in end-to-end test or integration test where the responses are not mocked.**

## About *Diffx*

We can use the library to make this kind of comparison very easy. Some of the pros of *diffx* are:

* Simple and intuitive APIs
    
* Very good customization ability
    
* Integration with different popular testing libraries like *scalatest*, *munit* and so on.
    
* Fully or semi typeclass derivation
    

## Setup

Diffx has support for both Scala 2 and Scala 3. For this article, I will be using Scala 3, but it is the same for Scala 2 as well.

We can also add the integration for our favourite unit testing library separately.

Let's add the dependencies in our *build.sbt*:

```scala
val diffxVersion = "0.8.2"
libraryDependencies ++= Seq(
  "com.softwaremill.diffx" %% "diffx-core" % diffxVersion
)
```

## Diffx Usages

In this section, let's look at some of the usages of diffx. To start with, let's create a very simple case class and compare the values.

```scala
case class Account(accountNo: String, accountHolder: String, accType: Int)
```

Next, let's add the necessary code for using diffx. In this case, we will be using an automatic derivation of the type class instances.

We can add the imports into our example case as:

```scala
import com.softwaremill.diffx.*
import com.softwaremill.diffx.generic.auto.{*, given}
```

Please note that in Scala 3, we need to explicitly add *given* keyword in the *import* statement to bring all the given(implicit) instances to scope.

Here we are using the automatic fully derivation and hence diffx will create the type class instances for all the fields in our case classes. As a result, we can now write and compare the results as:

```scala
val acc1 = Account("acc-1", "Yadu", 2)
val acc2 = Account("acc-1", "Yadu", 2)
val diffResult = compare(acc1, acc2)
assert(diffResult.isIdentical, diffResult.show())
```

If there is any difference in the case class instances, show() method print it in a different color so that it becomes very easy to understand. The `compare` method in the above example needs an implicit(given) typeclass for *Diff\[Account\]*. But diffx auto-derivation generates the required type classes at compile time.

Now, let's make it a bit more complicated by adding a nested structure as below:

```scala
  case class Transaction(
      id: String,
      from: Account,
      to: Account,
      amount: Int,
      dt: LocalDateTime
  )
```

Here, we have a `Transaction` case class. In our case, we need to compare 2 transactions and check if they are the same(for ex, to verify that we haven't introduced any new regression with new changes). However, the datetime field will always be different and hence the comparison will fail.

Diffx provides a way to ignore such fields from the comparison. Let's look at how we can do that:

```scala
given Diff[Transaction] = Diff.summon[Transaction].ignore(_.dt)
```

We can summon the instance of `Diff[Transaction]` and invoke the ignore method with the necessary field.

Now, we can use the compare method and which uses this new given instance for comparison. As a result, it will ignore the field `dt` while comparing the results.

Let's make the structure even more complex by adding more nested case classes with different fields:

```scala
case class Transaction(
    id: String,
    from: Account,
    to: Account,
    amount: Int,
    extras: TxnExtras,
    dt: LocalDateTime,
    remark: String
)
case class Account(accountNo: String, accountHolder: String, accType: Int)
case class TxnExtras(
    transferMode: TransferModes,
    internalLogs: Option[InternalInfo]
)
case class InternalInfo(
    correlationId: String,
    gatewayTS: LocalDateTime,
    deviceId: String
)
enum TransferModes {
  case MOBILE, WEB, OFFLINE
}
```

In the above structure, we have a 2nd level nested type `InternalInfo` which is part of `TxnExtras` field of Transaction. The field `gatewayTS` is a dynamic field that we want to avoid in comparison. Let's see how we can use the *Diff* instances in this case:

```scala
given Diff[InternalInfo] = Diff.summon[InternalInfo].ignore(_.gatewayTS)
given Diff[Transaction] = Diff.summon[Transaction].ignore(_.dt).ignore(_.id)
```

In the above code, we defined a *Diff\[InternalInfo\]* by ignoring the *gatewayTS* field. Additionally, we also ignored the fields on Transaction case class as well. So, during comparison, *diffx* uses the newly provided *Diff* instance for *InternalInfo* with the ignored field.

This way, it is very easy to configure the comparison requirements independently and use them without modifying the case classes.

Diffx also provides the ability to compare fields which might be a bit varying. For example, let's assume that we are doing a forex transfer with 2 different currencies. The forex rate varies in real-time and hence 2 transactions might not have the exact same value even if the amount transferred is the same by the sender.

In our case, the amount in the `to` field of *Transaction* might be different. However, while comparing we shouldn't ignore the field completely, as we want to avoid any regressions. Diffx provides some additional methods to compare values as approximated by providing an epsilon value.

For example, for a transaction of €100 -&gt; USD, with a forex rate of 1.05-1.07, the receiver should get somewhere between $105 and $107. We should verify that the value is not more than 107 or less than 105 in this particular case. Let's see how we can do this:

```scala
case class ForexConversion(euros: Double, usd: Double)
def convertToUSD(euros: Double) = (1 + Random.between(0.05d,0.07d)) * euros
val forex1 = ForexConversion(100, convertToUSD(100))
val forex2 = ForexConversion(100, convertToUSD(100))
println(compare(forex1,forex2).show())
```

If we execute the above code, we will always get the mismatch for the field `amount` in USD as the forex rate is random. We can verify that the value is within a particular range in this case by using *approximate()* function on the Diff instance using *modify*:

```scala
given Diff[ForexConversion] = Diff.summon[ForexConversion].modify(_.usd).setTo(Diff.approximate(2d))
```

Now, it will compare the USD value of forex2 within +2 or -2 of forex1 USD value.

We can also create custom comparison instances for the required types. For example, let's create an approximate *Diff* instance for *LocalDateTime* where we can allow a difference of 50 milliseconds:

```scala
class ApproximateDiffForDateTime(epsilonDur: Duration)
    extends Diff[LocalDateTime] {
  override def apply(
      left: LocalDateTime,
      right: LocalDateTime,
      context: DiffContext
  ): DiffResult = {
    val isWithin =
      ChronoUnit.MILLIS.between(left, right) <= epsilonDur.toMillis
    if (isWithin) {
      IdenticalValue(left)
    } else {
      DiffResultValue(left, right)
    }
  }
}
```

Now, we can create a new case class and use this custom diff for datetime:

```scala
case class SimpleTransaction(id: String, amount: Int, date: LocalDateTime)
val dateDiff = new ApproximateDiffForDateTime(50.millis)
given Diff[SimpleTransaction] =
  Diff.summon[SimpleTransaction].modify(_.date).setTo(dateDiff)
val s1 = SimpleTransaction("i1", 100, LocalDateTime.now)
val s2 = SimpleTransaction("i1",100,LocalDateTime.now().plus(20, ChronoUnit.MILLIS))
val res = compare(s1, s2)
```

Now, the comparison will fail only if the difference between 2 datetime is more than 50 milliseconds.

We can also apply *ignore* condition to a field within a collection without explicitly defining a Diff instance for the type within the collection. Let's look at an example:

```scala
case class Outer(id: Int, inner: Seq[Inner])
case class Inner(uuid: UUID, value: String)
val outer1 = Outer(100, Seq(Inner(UUID.randomUUID(), "Value1"), Inner(UUID.randomUUID(), "Value2")))
val outer2 = Outer(100, Seq(Inner(UUID.randomUUID(), "Value1"), Inner(UUID.randomUUID(), "Value2")))
```

Now, we can ignore the field *uuid* within the Inner case class using `each` as:

```scala
given Diff[Outer] = Diff.summon[Outer].ignore(_.inner.each.uuid)
val res = compare(outer1, outer2)
```

Sometimes, in a complex and nested structure, we might want to ignore all fields of a particular type from the comparison. For example, we might have multiple `LocalDateTime` fields with different field names within a nested structure. We can ignore all occurrences of LocalDateTime from comparison by providing a `Diff[LocalDateTime]`:

```scala
given Diff[LocalDateTime] = new Diff[LocalDateTime]:
   override def apply(
      left: LocalDateTime,
      right: LocalDateTime,
      context: DiffContext
  ): DiffResult = DiffResult.Ignored
```

Now, all the LocalDateTime fields(with any fieldName) will be ignored from the diff comparison.

## Conclusion

In this article, we looked at the library *diffx*. We saw different ways to configure the fields to compare. This is an extremely powerful library to use especially within end-to-end tests without polluting the models or writing a lot of boilerplate code. There are still more features available in this library which I haven't tried so far.

The sample code used here is available on [GitHub](https://github.com/yadavan88/blog-code-samples/tree/main/scala3/src) as well.
