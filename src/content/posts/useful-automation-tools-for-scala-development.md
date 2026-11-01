---
title: "Useful Automation Tools for Scala Development"
pubDatetime: 2023-03-19T16:04:30.000Z
description: "This article introduces popular and useful tools for Scala application development, such as GitHub Actions, Scalafmt, Mergfy, Scala Steward, etc."
tags:
  - "github"
  - "scala"
  - "automation"
ogImage: "/images/posts/useful-automation-tools-for-scala-development/6e3c2b5b-776a-4c7d-a271-5dc213b08e6c.jpeg"
---
> This article introduces popular and useful tools for Scala application development, such as GitHub Actions and Scalafmt, and provides installation and configuration instructions. It also provides examples of configuration files and commands to use scalafmt, Scala-Steward, and Mergify to automate development actions such as formatting code, updating library dependencies, and merging pull requests.

## 1. Introduction

Tooling and automation are very important ways for making application development easier and safer. As a result, there exist many useful tools to automate the development process.

In this short article, I would like to share some of the popular and useful tools that can be used in Scala application development. I am only covering some of the very common tools, and there could be many more tools available.

Moreover, this is going to be an introductory article and doesn't go in-depth about these tools. It is just intended to help with the initial setup and usage of these tools, after which it is very easy to extend it.

## 2. GitHub Actions

Jenkins is a popular tool for running CI / CD pipelines. However, we need to set up Jenkins in our environment and also it doesn't make sense to have that overhead in our personal projects. Moreover, Jenkins is normally dreaded even in enterprise setups due to the large effort required to maintain it.

GitHub is the most popular cloud source control system available now. GitHub provides a feature to implement CI/CD pipelines with very minimal maintenance using GitHub actions. Moreover, up to a limit, there is no fee needed to use it.

**The power of GitHub actions is its ability to configure it for very small workflows to highly complicated and sophisticated CI/CD systems**.

Let's look at how to set up a very simple Actions workflow in a simple project. In this case, all I want to do is to set up an environment to run my tests against a PR.

To use Actions, we can follow the steps mentioned in the [official documentation](https://docs.github.com/en/actions/quickstart). Here is a simple workflow I use as part of the sample code I use in my blog:

```yaml
name: Scala CI
on:
  push:
    branches: [ "main" ]
  pull_request:
    branches: [ "main" ]

permissions:
  contents: read

jobs:
  build:
    name: Build And Test
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - name: Set up JDK 11
      uses: actions/setup-java@v3
      with:
        java-version: '11'
        distribution: 'temurin'
        cache: 'sbt'
    - name: Run Tests
      run: sbt clean scalafmtCheckAll test
```

With this setup, a GitHub Action executes for every PR created against the `main` branch. This way, I don't need any other setup or environment to ensure that my code is not affected due to any PR changes.

## 3. Scalafmt

[Scalafmt](https://scalameta.org/scalafmt/) is a code formatter for the Scala codebase. We can configure the code format styles using a configuration file and can execute and format the code from the command line. **This way, the code format is not dependent on the IDE and hence teammates can easily use any IDE without worrying about merge conflicts due to formatting**.

Advantages of Scalafmt

* Command line option to run formatting
    
* Integration with different IDEs
    
* Easy configuration using config file
    
* Formatting validation options - useful in CI builds
    
* Customization based on language version (Scala 2.12, 2.13, or 3)
    

### 3.1. Installation

We can either [install](https://scalameta.org/scalafmt/docs/installation.html) it as a standalone app or by using a plugin for your build tool such as *sbt*, *maven*, *gradle*, *mill* and so on. In this case, I am using the *sbt-plugin* for the demo purpose. So, let's add the following config to the *plugins.sbt* file:

```scala
addSbtPlugin("org.scalameta" % "sbt-scalafmt" % "2.4.6")
```

### 3.2. Configurations

Now that it is installed, we need to create the config file, `.scalafmt.conf`. There are so many configuration options available, which can be found [here](https://scalameta.org/scalafmt/docs/configuration.html).

Here is a simple config content:

```scala
version = "3.7.2"
runner.dialect = scala213
```

`runner.dialect` is a set of predefined config rules based on the scala version 2.13. Other popular dialects are `scala212`, `scala3`.

We can also apply different configurations for different sub-modules in a project. For example, let's see how we can change the dialect for different modules:

```scala
version = "3.7.2"
runner.dialect = scala213
fileOverride {
  "glob:**/scala3/src/**" {
     runner.dialect = scala3
  }
}
```

Now, the default dialect is used as `scala213`. However, within the module name `scala3` I can apply the dialect as `scala3`. This is just by using a regex-like syntax.

If there are many sub-modules with different scala versions, there is another better(?) approach to handle this. **We can use the config layout property** `project.layout` **to separate dialects.** However, this needs a particular directory structure change.

For example, if we have a project with scala 2.12, 2.13, and 3, we can set a default runner based on the main version. In this case, let's assume that the default version is Scala 3, and there are some other modules with Scala 2.12 and 2.13 versions as well. In this case, we can rename the directory structure in the scala 2 projects as:

`src/main/scala-2.12` , `src/test/scala-2.12` , `src/main/scala-2.13`

Now, the language dialect will be selected automatically for these modules without explicitly providing `fileOverride` property. We can also use the structure as `src/main/scala-2`, which uses the latest Scala-2 version (2.13 as of now).

### 3.3. Usage

Now, let's look at some of the commands that we can use with scalafmt. As mentioned before, I'll be using sbt for this case.

To format all the files in `src/main/`, we can use the command `sbt scalafmt`. To format all the files including tests, we can use the command `sbt scalafmtAll`.

Additionally, we can check if all the files are properly formatted in the repository by using the commands `sbt scalafmtCheck` or `sbt scalafmtCheckAll`. This is extremely useful in CI jobs so that we can ensure that the new PRs are not messing up the formats. For example, we can use the build command `sbt clean compile scalafmtCheckAll test` to verify formatting and execute the tests.

You may refer to my sample config file [here](https://github.com/Baeldung/scala-tutorials/blob/master/.scalafmt.conf).

## 4. Scala-Steward

[Scala-Steward](https://github.com/scala-steward-org/scala-steward) is a bot that helps to keep the Scala library dependencies up to date. **Once configured Scala-Steward analyses the build definitions and creates PR with updated versions whenever available**. It also provides many configurations to customize the PRs.

This way, it is very easy to keep the codebase up to date without any manual overhead.

To get started, all we need to do is to add our GitHub repository to the Scala-Steward list. Then, depending on the configured duration, Scala-Steward creates new PRs with updated versions. It is also possible to ignore a particular dependency from updates(For e.g., keep the Akka version as 2.6.x due to license issues).

It is also possible to set up Scala-Steward locally within your organization if the codebase is not in *github.com*.

We can create `.scala-steward.conf` file in the repository to customize the PRs. You may refer to a sample config file [here](https://github.com/scala-steward-org/scala-steward/blob/main/docs/repo-specific-configuration.md).

**There are some other such dependency bots such as** [**Dependabot**](https://github.com/dependabot) **which can additionally perform dependency monitoring and security vulnerability checks**.

## 5. Mergify

[Mergify](https://mergify.com/) is another bot that can help in automating development actions. **Mergify lets us configure and set up rules and merge the PRs automatically if all the rules pass**. However, *Mergify* is free only for open-source usage, and for other cases need to purchase a plan.

Alternatively, you can also use GitHub Action [auto-merge](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/incorporating-changes-from-a-pull-request/automatically-merging-a-pull-request) feature.

I have set up Mergify in one of the repositories to automatically merge PRs created by Scala-Steward. This way, my library dependencies are always updated in the `main` branch.

Here is a simple `.mergify.yml` the configuration that I use in my blog repository:

```yaml
pull_request_rules:
- name: label scala-steward's PRs
  conditions:
  - author=scala-steward
  actions:
    label:
      add:
      - dependency-update
      remove: []
- name: merge scala-steward's PRs
  conditions:
  - author=scala-steward
  - status-success=Build And Test
  - "#files=1"
  actions:
    merge:
      method: squash
```

This *mergify* configuration performs the following actions:

1. If a PR is created by `scala-steward`, it adds the label `dependency-update` to the PR
    
2. Checks if the GitHub Action build with the name `Build And Test` has passed
    
3. Checks if the number of files changed as part of the PR is 1
    
4. If steps 2 & 3 are true, then the PR is merged by `squash`
    

Here is another *mergify* config that does more things.

```yaml
pull_request_rules:
  - name: Automatic merge on approval
    conditions:
      - label!=early-semver-major
      - label!=semver-spec-major
      - or:
        - files~=\.sbt$
        - files~=ScalaVersions.scala
        - files~=build.properties
      - "#approved-reviews-by>=1"    
      - check-success=CI - Jenkins
      - author=scala-steward-baeldung[bot]
      - or:
        - label=early-semver-minor
        - label=early-semver-patch
    actions:
      merge:
        method: merge
      delete_head_branch:
```

Here, we have a more complicated workflow based on file names, labels, build status and so on.

## 6. Conclusion

In this blog, we looked at some of the useful automation tools that can be used with our Scala(not necessarily) repository.

**With a combination of the above-mentioned tools, we can make the process very simple and safe**. I have barely scratched the surface of all these tools. Once the basic setup is done, it is much easier to explore the more complex features of all these tools. The link to the GitHub repository is [here](https://github.com/yadavan88/blog-code-samples).

Please leave a reaction or a comment if you found this useful.
