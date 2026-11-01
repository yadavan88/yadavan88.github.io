---
title: "Data Validation and Error Accumulation using Cats Validated"
pubDatetime: 2022-05-30T10:16:02.000Z
description: "Let's see how this is not good in certain scenarios. Assume that we have a simple use-case of transfer of money between two bank accounts. The user input model looks like below and have some..."
tags:
  - "scala"
  - "cats"
---
## Introduction
For any software application, validation of the input data is very important. In this article, let's look at Cats [Validated](https://typelevel.org/cats/datatypes/validated.html) and how it makes data validation better and easier.

## Why Validated?
Scala standard library already provides error handling features using *Either* or *Try*. Then, why use a different type for the same purpose? 
Even though *Try* and *Either* are  good for most of the scenarios, but accumulation of multiple errors are not easy with them. Both are monads and also follows the ***fail-fast*** approach. That means, when we use flatMap or for-comprehension, the flow will immediately exit when the first error (or non-desired case) occurs. 

Let's see how this is not good in certain scenarios. Assume that we have a simple use-case of transfer of money between two bank accounts. The user input model looks like below and have some validation requirements as mentioned:

```scala
case class Transaction(fromAccount: String, toAccount: String, amount: Long)
``` 
 Validation requirements:
- Account number should be a 10 digit number
- Amount can't be negative

When we implement this validation, it is better to perform all the validations and send back all the errors in one go. 

That means, we can't perform a *for-comprehension* like below, since it will return the first failure.

```scala
for {
  fromAccountNo <- validateAccount(fromAcc)
  toAccountNo <- validateAccount(toAcc)
  amt <- validateAmount(amount)
} yield ()
``` 
In this case, we will have to do separate validations and combine them individually with some boilerplate code. This is where *Validated* comes to rescue.

## Setup
To use Validated, we can add the cats library dependency to the build.sbt:

```
libraryDependencies += "org.typelevel" %% "cats-core" % "2.3.0"
``` 
Now, we can use the Validated and other extension methods using the imports:

```
import cats.implicits._
import cats.data._
import cats.data.Validated._
``` 

## Building Validated Instances
Now that we have added the dependencies, let's try to create a simple Validated instance. *Validated* type looks very similar to Either, with a *Valid* and *Invalid* part. Similar to *Either*, the *Invalid* part is in the left side and Valid type on the right.

```scala
val aValidData: Validated[String,Int] = Valid(100)
val anInvalidData: Validated[String, Int] = Invalid("Invalid input")
``` 
We can also use the extension methods *valid* and *invalid* to do the same thing:

```scala
val aValidData_v2: Validated[String,Int] = 100.valid[String]
val anInvalidData_v2: Validated[String,Int] = "Invalid input".invalid[Int]
``` 
We can also provide a condition and create a Validated instance based on the result. For example, let's see how we can validate the account number and validate the data:

```scala
val validatedFromAcc = Validated.cond(fromAccount.matches("[0-9]{10}"), fromAccount, "Invalid From Account Number")
``` 
If the account number doesn't contain 10 digits, then this will return an Invalid instance. If it is valid, it will return a Valid instance with the account number. This is because, it is easier to accumulate multiple errors in a list for each validations. Now let' add validation for *amount*:

```scala
val validatedAmount = Validated.cond(amt > 0, amt, "Invalid Amount")
``` 

## Combining Validated Results
When we have multiple fields to be validated, we will need to combine the validations and provide all the failure results together. To accumulate all the errors, we can use the type *NonEmptyList* with Validated instance. Cats already provides a type alias to use it as *ValidatedNel*. This allows to capture and accumulate all the errors into a single channel. 

Before that, let's create a set of models to capture different error scenarios. We can implement them using a simple ADT as:

```scala
sealed trait BankValidation {
  def error: String
}
case object InvalidAccount extends BankValidation {
  def error = s"The account number should contain 10 digits"
}
case object InvalidAmount extends BankValidation {
  def error = "The transfer account must be greater than 0"
}
``` 
Now, let's try to convert out earlier bank transfer case using Validated instances:

```scala
def validateAccount(account: String): ValidatedNel[BankValidation, String] = {
    Validated.cond(
        account.matches("[0-9]{10}"), account,
        InvalidAccount
    ).toValidatedNel
}
def validateAmount(amount: Long): ValidatedNel[BankValidation, Long] = {
    Validated.cond(
        amount > 0,
        amount,
        InvalidAmount
    ).toValidatedNel
}
``` 
Please note the method *toValidatedNel*, this converts a *Validated* to a *ValidatedNel*.

Now, we can use this validator to process the transaction:

```scala
def validateInput(
        fromAccount: String,
        toAccount: String,
        amount: Long
): ValidatedNel[BankValidation, Transaction] = {
    (
      validateAccount(fromAccount),
      validateAccount(toAccount),
      validateAmount(amount)
    ).mapN(Transaction)
}
``` 
In the above code, we validated account numbers and amount and then used *mapN* to build the *Transaction*. If any of the validation fails, then it will return an Invalid instance with all the errors. Otherwise, a valid instance with *Transaction* case class.

## Other Combinators

Now, let's look at other ways to combine different validators. 

### AndThen
Sometimes, we might need to do multiple validations for the same field itself. For example, apart from the positive check for the amount, we might need to check if the transfer amount is within the max allowed limit. We can build multiple smaller validators and combine them easily using *andThen*. It allows to chain the validators one after the other as:

```scala
val amountValidated: ValidationResult[Long] = validateAmount(amount).andThen(amt => validateMaxAmount(amt, 1000))
``` 
If the amount is a positive number, then it will check for max amount using the 2nd validator.

### Product
Another way to combine multiple validators is using *product*. This will combine the valid parts into tuple. Let's look at an example:

```scala
val productValidator: Validated[NonEmptyList[BankValidation],(String, Long)] = validateAccount(toAccountNo) product validateAmount(amount)

``` 
Sometimes, we need only one of the result. In such case, we can use *productR* or *productL*. *R* and *L* after product decides which validator's result to keep. For example, let's assume that we need to do validate that the transaction should have separate to and from account. We have already validated the transaction fields and created the case class using the *mapN* combinator before. On top of that, let's make sure that the from and to account are not same. We can achieve it by using *productL* combinator.
First, let's define the validation method:

```scala
def isFromAndToSame(
      fromAccount: String,
      toAccount: String
): ValidatedNel[BankValidation, Unit] = {
    Validated.cond(
        fromAccount != toAccount,
        (),
        FromAndToAccountCantBeSame
     ).toValidatedNel
}
``` 
Now, let' apply this to the previous validated transaction as:

```scala
val finalValidated: ValidationResult[Transaction] = 
  fieldValidatedTxn.productL(
     isFromAndToSame(
        txn.fromAccount,
        txn.toAccount
  )
``` 
Here, the result of the right validator (Unit, in the above example) was ignored. If the validation fails, then the result will be made as *Invalid*, otherwise the transaction case class is returned as *Valid*. Instead of *productR*, we can use its alias operator `<*` as well.
*ProductR* will do the opposite and return the result on the right side of the combinator. The alias for *productR* is `*>`

## Conclusion
In this blog, we looked at data validation and error accumulation using Cats Validated. The sample code used here is available [here in GitHub](https://github.com/yadavan88/blog-code-samples/tree/main/cats).
