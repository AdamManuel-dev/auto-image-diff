# CI/CD Integration Guide

This guide covers integrating auto-image-diff into continuous integration and deployment pipelines.

## Overview

auto-image-diff is designed to work seamlessly in CI/CD environments:

- Zero configuration for basic usage
- Exit codes for pass/fail detection
- Machine-readable output formats
- Artifact generation for debugging
- Parallel processing for speed

## GitHub Actions

### Basic Setup

```yaml
name: Visual Regression Tests
on: [push, pull_request]

jobs:
  visual-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Install ImageMagick
        run: sudo apt-get update && sudo apt-get install -y imagemagick

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: "18"

      - name: Install auto-image-diff
        run: npm install -g auto-image-diff

      - name: Run Visual Tests
        run: |
          aid compare \
            tests/baseline/screenshot.png \
            tests/current/screenshot.png \
            tests/results/ \
            --threshold 0.1

      - name: Upload Artifacts
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: visual-diff-results
          path: tests/results/
```

### Advanced Workflow

```yaml
name: Visual Regression Suite
on:
  pull_request:
    types: [opened, synchronize]

jobs:
  capture-screenshots:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Environment
        uses: actions/setup-node@v3
        with:
          node-version: "18"
          cache: "npm"

      - name: Install Dependencies
        run: npm ci

      - name: Run E2E Tests & Capture Screenshots
        run: npm run test:e2e:screenshots

      - name: Upload Screenshots
        uses: actions/upload-artifact@v3
        with:
          name: screenshots
          path: tests/screenshots/
          retention-days: 7

  visual-regression:
    needs: capture-screenshots
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup ImageMagick
        run: |
          sudo apt-get update
          sudo apt-get install -y imagemagick
          convert -version

      - name: Install auto-image-diff
        run: npm install -g auto-image-diff

      - name: Download Screenshots
        uses: actions/download-artifact@v3
        with:
          name: screenshots
          path: tests/current/

      - name: Run Batch Comparison
        id: visual-tests
        run: |
          aid batch \
            tests/baseline/ \
            tests/current/ \
            tests/results/ \
            --threshold 0.5 \
            --smart \
            --smart-pairing \
            -e tests/ci-exclusions.json

      - name: Generate Summary
        if: always()
        run: |
          if [ -f tests/results/batch-summary.json ]; then
            echo "## Visual Regression Results" >> $GITHUB_STEP_SUMMARY
            echo "| Metric | Value |" >> $GITHUB_STEP_SUMMARY
            echo "| --- | --- |" >> $GITHUB_STEP_SUMMARY
            echo "| Total Files | $(jq '.totalFiles' tests/results/batch-summary.json) |" >> $GITHUB_STEP_SUMMARY
            echo "| Passed | $(jq '.passed' tests/results/batch-summary.json) |" >> $GITHUB_STEP_SUMMARY
            echo "| Failed | $(jq '.failed' tests/results/batch-summary.json) |" >> $GITHUB_STEP_SUMMARY
            echo "| Average Diff | $(jq '.averageDifference' tests/results/batch-summary.json)% |" >> $GITHUB_STEP_SUMMARY
          fi

      - name: Comment on PR
        if: failure() && github.event_name == 'pull_request'
        uses: actions/github-script@v6
        with:
          script: |
            const fs = require('fs');
            const summary = JSON.parse(fs.readFileSync('tests/results/batch-summary.json'));

            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `## ❌ Visual Regression Tests Failed
              
              **${summary.failed}** visual differences detected out of **${summary.totalFiles}** comparisons.
              
              Average difference: **${summary.averageDifference.toFixed(2)}%**
              
              [View detailed results](https://github.com/${context.repo.owner}/${context.repo.repo}/actions/runs/${context.runId})`
            });

      - name: Upload Results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: visual-regression-results
          path: tests/results/
```

## GitLab CI

### Basic Configuration

```yaml
# .gitlab-ci.yml
stages:
  - test
  - visual

visual-regression:
  stage: visual
  image: node:18
  before_script:
    - apt-get update && apt-get install -y imagemagick
    - npm install -g auto-image-diff
  script:
    - |
      aid batch \
        tests/baseline/ \
        tests/screenshots/ \
        visual-results/ \
        --threshold 0.5 \
        --concurrency 4
  artifacts:
    when: always
    paths:
      - visual-results/
    reports:
      junit: visual-results/junit.xml
    expire_in: 1 week
  only:
    - merge_requests
    - main
```

### With Docker

```yaml
# .gitlab-ci.yml
visual-tests:
  stage: test
  image:
    name: node:18-alpine
    entrypoint: [""]
  services:
    - docker:dind
  before_script:
    - apk add --no-cache imagemagick
    - npm install -g auto-image-diff
  script:
    - docker run --rm -v $(pwd):/app your-app npm run test:screenshots
    - |
      aid batch \
        /app/baseline/ \
        /app/screenshots/ \
        /app/results/ \
        --smart
  coverage: '/Difference: \d+\.\d+%/'
```

## Jenkins

### Jenkinsfile

```groovy
pipeline {
    agent any

    environment {
        AID_THRESHOLD = '0.5'
        AID_CONCURRENCY = '4'
    }

    stages {
        stage('Setup') {
            steps {
                sh 'npm install -g auto-image-diff'
            }
        }

        stage('Capture Screenshots') {
            steps {
                sh 'npm run test:e2e:screenshots'
            }
        }

        stage('Visual Regression') {
            steps {
                script {
                    def exitCode = sh(
                        script: '''
                            aid batch \
                                tests/baseline/ \
                                tests/screenshots/ \
                                tests/results/ \
                                --threshold ${AID_THRESHOLD} \
                                --concurrency ${AID_CONCURRENCY} \
                                --smart
                        ''',
                        returnStatus: true
                    )

                    if (exitCode != 0) {
                        currentBuild.result = 'UNSTABLE'

                        // Parse results
                        def summary = readJSON file: 'tests/results/batch-summary.json'

                        // Add build description
                        currentBuild.description = """
                            Visual Regression: ${summary.failed} failures
                            Average Diff: ${summary.averageDifference}%
                        """
                    }
                }
            }
        }
    }

    post {
        always {
            // Archive results
            archiveArtifacts artifacts: 'tests/results/**/*', allowEmptyArchive: true

            // Publish HTML report
            publishHTML([
                allowMissing: false,
                alwaysLinkToLastBuild: true,
                keepAll: true,
                reportDir: 'tests/results',
                reportFiles: 'batch-report.html',
                reportName: 'Visual Regression Report'
            ])
        }
    }
}
```

### Declarative Pipeline with Stages

```groovy
pipeline {
    agent {
        docker {
            image 'node:18'
            args '-v /tmp:/tmp'
        }
    }

    stages {
        stage('Install Dependencies') {
            steps {
                sh '''
                    apt-get update && apt-get install -y imagemagick
                    npm install -g auto-image-diff
                '''
            }
        }

        stage('Visual Tests - Components') {
            steps {
                sh '''
                    aid batch \
                        baseline/components/ \
                        current/components/ \
                        results/components/ \
                        --pattern "*.png" \
                        --threshold 0.1
                '''
            }
        }

        stage('Visual Tests - Pages') {
            steps {
                sh '''
                    aid batch \
                        baseline/pages/ \
                        current/pages/ \
                        results/pages/ \
                        --pattern "*.png" \
                        --threshold 0.5 \
                        --exclude ci-exclusions.json
                '''
            }
        }
    }
}
```

## CircleCI

```yaml
# .circleci/config.yml
version: 2.1

orbs:
  node: circleci/node@5.0

jobs:
  visual-regression:
    executor: node/default
    steps:
      - checkout

      - run:
          name: Install ImageMagick
          command: |
            sudo apt-get update
            sudo apt-get install -y imagemagick

      - node/install-packages:
          pkg-manager: npm
          app-dir: .

      - run:
          name: Install auto-image-diff
          command: sudo npm install -g auto-image-diff

      - run:
          name: Run Visual Tests
          command: |
            aid batch \
              tests/baseline/ \
              tests/screenshots/ \
              tests/results/ \
              --threshold 0.5 \
              --smart-pairing

      - store_test_results:
          path: tests/results/junit.xml

      - store_artifacts:
          path: tests/results
          destination: visual-regression

workflows:
  version: 2
  test:
    jobs:
      - visual-regression
```

## Travis CI

```yaml
# .travis.yml
language: node_js
node_js:
  - 18

addons:
  apt:
    packages:
      - imagemagick

install:
  - npm install -g auto-image-diff

script:
  - |
    aid batch \
      tests/baseline/ \
      tests/screenshots/ \
      tests/results/ \
      --threshold 0.5 \
      --concurrency 2

after_failure:
  - tar -czf visual-results.tar.gz tests/results/

deploy:
  provider: releases
  api_key: $GITHUB_TOKEN
  file: visual-results.tar.gz
  skip_cleanup: true
  on:
    tags: true
    condition: $TRAVIS_TEST_RESULT = 1
```

## Azure DevOps

```yaml
# azure-pipelines.yml
trigger:
  branches:
    include:
      - main
      - develop

pool:
  vmImage: "ubuntu-latest"

steps:
  - task: NodeTool@0
    inputs:
      versionSpec: "18.x"
    displayName: "Install Node.js"

  - script: |
      sudo apt-get update
      sudo apt-get install -y imagemagick
    displayName: "Install ImageMagick"

  - script: npm install -g auto-image-diff
    displayName: "Install auto-image-diff"

  - script: |
      aid batch \
        tests/baseline/ \
        tests/screenshots/ \
        tests/results/ \
        --threshold 0.5 \
        --smart
    displayName: "Run Visual Regression Tests"
    continueOnError: true

  - task: PublishTestResults@2
    inputs:
      testResultsFormat: "JUnit"
      testResultsFiles: "tests/results/junit.xml"
      failTaskOnFailedTests: true

  - task: PublishBuildArtifacts@1
    inputs:
      pathToPublish: "tests/results"
      artifactName: "visual-regression-results"
    condition: always()
```

## Best Practices

### 1. Exclusion Files

Create CI-specific exclusion files:

```json
// ci-exclusions.json
{
  "regions": [
    {
      "name": "timestamp",
      "bounds": { "x": 0, "y": 0, "width": 200, "height": 30 },
      "reason": "Dynamic timestamp in CI"
    },
    {
      "name": "version",
      "bounds": { "x": 0, "y": 980, "width": 100, "height": 20 },
      "reason": "Build version number"
    }
  ]
}
```

### 2. Threshold Configuration

```bash
# Development (more lenient)
THRESHOLD=1.0

# Staging (moderate)
THRESHOLD=0.5

# Production (strict)
THRESHOLD=0.1
```

### 3. Baseline Management

```bash
#!/bin/bash
# update-baselines.sh

if [ "$UPDATE_BASELINES" = "true" ]; then
  echo "Updating visual baselines..."
  cp -r tests/screenshots/* tests/baseline/
  git add tests/baseline/
  git commit -m "chore: update visual regression baselines"
fi
```

### 4. Failure Handling

```javascript
// visual-test-runner.js
const { execSync } = require("child_process");

try {
  execSync("aid batch baseline/ current/ results/", {
    stdio: "inherit",
  });
} catch (error) {
  // Generate detailed failure report
  const summary = require("./results/batch-summary.json");

  console.error(`
Visual Regression Failed:
- Failed: ${summary.failed}/${summary.totalFiles}
- Average Difference: ${summary.averageDifference}%

Review the results at: results/batch-report.html
  `);

  process.exit(1);
}
```

### 5. Performance Optimization

```yaml
# Parallel matrix builds
strategy:
  matrix:
    test-suite:
      - components
      - pages
      - mobile
  parallel: 3

steps:
  - run: |
      aid batch \
        baseline/${{ matrix.test-suite }}/ \
        current/${{ matrix.test-suite }}/ \
        results/${{ matrix.test-suite }}/ \
        --concurrency 8
```

## Troubleshooting

### ImageMagick Not Found

```bash
# Ubuntu/Debian
apt-get update && apt-get install -y imagemagick

# Alpine
apk add --no-cache imagemagick

# macOS (for local testing)
brew install imagemagick
```

### Memory Issues

```yaml
# Increase Node.js memory
env:
  NODE_OPTIONS: "--max-old-space-size=4096"
```

### Slow Performance

```bash
# Use optimal concurrency based on CPU cores
aid batch ref/ target/ out/ -c $(nproc)

# For memory-constrained environments
aid batch ref/ target/ out/ -c 2
```

## See Also

- [CLI Usage](./CLI_USAGE.md) - Command reference
- [Batch Processing](./BATCH_PROCESSING.md) - Batch features
- [Troubleshooting](../TROUBLESHOOTING.md) - Common issues
