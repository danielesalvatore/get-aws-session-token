# AWS Get Session Token

A simple Node.js command line wizard to generate AWS session tokens for MFA-enabled users.

## Getting started

- Make sure you have the AWS CLI installed
- Make sure you have a valid AWS user security credentials (Access key Id, Secret access key)
- Use the AWS user security credentials to configure a profile in you `~/.aws/credentials` file as
  following:

```
[my-profile]
aws_access_key_id = XXX
aws_secret_access_key = YYY
```

- Backup your `~/.aws/credentials` and `~/.aws/config` files
- Create a file named `clients.json` from the `clients.example.json` in the project root folder, and
  compile the clients configuration.
- Each client configuration may include the following parameters attributes:
  - `MFASerialNumber`: the ARN of the MFA device associated to your users. This can be found on AWS
    console > IAM > Users > (select your user) > Security credentials tab
  - `OutputProfileName`: the named profile you want to generate. This profile is the one to use to
    interact with AWS APIs
  - `Profile`: (optional) if you want to use a specific AWS named profile to generate the session
    token
- Create a file named `config` in the project root folder. This file will override your current
  `~/.aws/config` file and its structure is described in the
  [Configuration and credential file settings AWS doc](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-files.html)

## Additional documentation

[AWS CLI named profile AWS doc](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-profiles.html)

### Disclaimer

THE SOFTWARE IS DISTRIBUTED ON A "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND.
