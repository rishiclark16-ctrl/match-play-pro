fastlane documentation
----

# Installation

Make sure you have the latest version of the Xcode command line tools installed:

```sh
xcode-select --install
```

For _fastlane_ installation instructions, see [Installing _fastlane_](https://docs.fastlane.tools/#installing-fastlane)

# Available Actions

## iOS

### ios beta

```sh
[bundle exec] fastlane ios beta
```

Build and upload to TestFlight

Usage: fastlane beta

### ios release

```sh
[bundle exec] fastlane ios release
```

Build and submit to App Store review

Usage: fastlane release

### ios build

```sh
[bundle exec] fastlane ios build
```

Build the app without uploading

Usage: fastlane build

### ios bump_version

```sh
[bundle exec] fastlane ios bump_version
```

Bump version number

Usage: fastlane bump_version type:patch (or minor, major)

### ios bump_build

```sh
[bundle exec] fastlane ios bump_build
```

Bump build number only

Usage: fastlane bump_build

### ios screenshots

```sh
[bundle exec] fastlane ios screenshots
```

Capture App Store screenshots

Usage: fastlane screenshots

### ios certs

```sh
[bundle exec] fastlane ios certs
```

Sync certificates and provisioning profiles

Usage: fastlane certs

### ios test

```sh
[bundle exec] fastlane ios test
```

Run tests

### ios version

```sh
[bundle exec] fastlane ios version
```

Get current version and build number

----

This README.md is auto-generated and will be re-generated every time [_fastlane_](https://fastlane.tools) is run.

More information about _fastlane_ can be found on [fastlane.tools](https://fastlane.tools).

The documentation of _fastlane_ can be found on [docs.fastlane.tools](https://docs.fastlane.tools).
