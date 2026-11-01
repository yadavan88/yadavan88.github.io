---
title: "Creating an SBT Project Template using Giter8"
pubDatetime: 2022-04-06T19:40:29.000Z
description: "Giter8 can be used in two different ways."
tags:
  - "scala"
  - "sbt"
---
## 1. Introduction
**Giter8** is a command line tool for creating templates for mainly Scala Projects. **Giter8(g8) templates helps to quickly setup and start a Scala Project**. 
In this blog, let's look at how we can create a custom g8 template and use it to create a simple sbt project.

## 2. Usage
We can use any available g8 templates to create project. Many of the standard templates are available on [github](https://www.scala-sbt.org/1.x/docs/sbt-new-and-Templates.html).

Giter8 can be used in two different ways. 

### 2.1. Integrated with sbt
Here we can use the command: 
```
sbt new <path to the g8 template>
```
For example, to create a simple scala application, we can use the template *[scala-seed.g8](https://github.com/scala/scala-seed.g8)* as:
```
sbt new scala/scala-seed.g8
```
This will create a small and working scala sbt project.

### 2.2. Standalone app as part of [Coursier](https://github.com/yadavan88/coursier-cheatsheets)

If we have giter8 installed as a coursier app, we can use it directly instead of creating through sbt. This may be a bit faster as it is not needed to startup sbt to create a project. 
The syntax is almost same as in sbt:
```
g8 scala/scala3.g8
```

## 3. Creating Custom Template
Sometimes, it is good to create new templates for your specific scenarios. It can then be shared across the teams for easier and faster development experience. 

We can create a custom g8 template using the [g8 template](https://github.com/foundweekends/giter8.g8) provided by the creators of this tool. Once the template is created, we can modify it according to our needs. 

The code templates are put under the path ***src/main/g8*** path within the previously created template. Here we can put all the necessary files such as *Scala*, *Plugins*, *SBT*, *Properties* and so on. 

There is a special file called as default.properties. This file is placed under *src/main/g8* directory. In this properties file, we can define all the variables. The keys provided here will be shown when a new project is created. The values set for each keys are used as default if user doesn't give any value while prompting.
Let's look at an example file:

```
name=scala-app-packaging
package=com.yadavan88
sbt_version=maven(org.scala-sbt, sbt, stable)
scalaVersion=2.13.7
munitVersion=maven(org.scalameta, munit_2.13, stable)
```
When we create a project from this template, it uses these values to create the prompt:

![image.png](/images/posts/creating-an-sbt-project-template-using-giter8/KRu743pbG.png)

The method ***maven()*** helps to dynamically use the libraries. **We can provide the maven co-ordinates for required libraries and it will use the latest version while the project is created.**

These properties can be used in other parts of the template. For example, we need to create the Main class under the package provided under the field *package* in the above prompt. For that we can use the variable wrapped in $ symbol when needed. 

```
package $package$.app
object MainApp extends App {
    println("Hello, World!")
} 
```

While creating the project, the value for *$package$* will be replaced with the value provided as part of the prompt. The same approach can be used for creating directory structure as well. 

## 4. Using the Custom Template
If the template is already available in github or any other git repository, we can use it to create and test the template.
Otherwise, we can also create the project from the local repository. For that, instead of giving the github url, we need to provide the path to the g8 template directory:

```
sbt new file://<path_to_giter8-demo.g8>
```
**By default giter8 will use the default branch of the repository to find the template**. However, if the required template is in another branch, we can use the *--branch branchname* to use that particular branch instead.

```
sbt new yadavan88/giter8-demo.g8 --branch demo
```
***Note:*** Make sure that the template repository name ends with **.g8**. For example, the repo for giter8-demo is *yadavan88/giter8-demo**.g8*** 

We can create not just sbt and scala projects using giter8. We can also use it to create templates for any other project types or languages.  

## Conclusion
In this blog, we looked at how we can use giter8 to create sbt project templates. I have created a sample template in github [here](https://github.com/yadavan88/giter8-demo.g8). You may refer this template to create your own ones.
