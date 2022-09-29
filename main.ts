import { Construct } from "constructs";
import { App, TerraformStack, Fn, Token} from "cdktf";
import { AwsProvider, datasources, vpc } from "./.gen/providers/aws";
import { Vpc } from "./.gen/modules/terraform-aws-modules/aws/vpc";
import { Ec2Instance } from "./.gen/modules/terraform-aws-modules/aws/ec2-instance";
import { KeyPair } from "./.gen/modules/terraform-aws-modules/aws/key-pair";

class MyStack extends TerraformStack {

  public vpc: Vpc;
  public ec2: Ec2Instance;
  public keypair: KeyPair;
  
  constructor(scope: Construct, name: string) {
    super(scope, name);

    new AwsProvider(this, "aws", {
      region: "us-east-2"
    });

    const allAvailabilityZones = new datasources.DataAwsAvailabilityZones(
      this,
      "all-availability-zones",
      {}
    ).names;

    this.vpc = new Vpc(this, "vpc",{
      name: "test-vpc,",
      cidr: "10.0.0.0/16",
      azs: allAvailabilityZones,
      privateSubnets: ["10.0.1.0/24", "10.0.2.0/24"],
      publicSubnets: ["10.0.3.0/24", "10.0.4.0/24"],
      enableNatGateway: true,
      singleNatGateway: true,
      enableDnsHostnames: true,
      tags: {
        ["Name"]: "test-cdktf",
      },
      publicSubnetTags: {
        ["Name"]: "cdktf-public",
      },
      privateSubnetTags: {
        ["Name"]: "cfktf-private",
      },
    });

    const sg = new vpc.SecurityGroup(this, "sg", {
      namePrefix: "cdkf-sg",
      vpcId: this.vpc.vpcIdOutput,

      ingress: [
        {
          fromPort: 22,
          toPort: 22,
          protocol: "tcp",

          cidrBlocks: ["10.0.0.0/8"],
        },
      ],
    });

    this.keypair = new KeyPair(this, "keypair", {
      keyName: "deployer-key",
      publicKey: "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQCfYaU079bFSKQlFA0DZYRxIECwRjxfAQBd+ka5jEPumNuHsXiIBTIyvEzfZbiTh/FWLpvSpBWP+gUy5XTTFYozkCaOVjSRpLM7e5YiU9gT+d8HyXXRmVF3JUfPxIIjfPB6k1Ex0kD5Bqj9+6P2M/qpTG9XpEKghLwvON3KhdiX0X4dvFE5Zh0hm+I4O+evpdKL9Y7B4pt4pP8t4g9UuEqjJeRl+97tT9LgvnVzBky+G9RdP60OeMMVGO2BzMJjjOwWEeZQJc7Br/YgpN1HGiYeNFfgCFgWlpku29H5Nx9c88qP3WT6fcHirBokRj+szV4myZok2V6li1wmuGL06k5eJYi0k57/l7Ieut86UXO0Zf8Wlt/HuaC5oBF+1OB0K4CCX0B5MF5USPD0qIhdxl10C6NZqay5kTgnjMDNBneYKprchz8p19GrYseEZG7FeRNn/HmTiylyJamza4KXd1UiEP9CHilvc0xislW6znFQOfOgKgMsGYAWDMJfjvORUQk= dipendra@kali",
    });

    this.ec2 = new Ec2Instance(this, "ec2", {
      name: "cdktf-ec2",
      ami: "ami-097a2df4ac947655f",
      instanceType: "t2.micro",
      // subnetId: Fn.tostring(this.vpc.publicSubnetsOutput, 0),
      subnetId: Fn.element(Token.asList(this.vpc.publicSubnetsOutput), 0),
      vpcSecurityGroupIds: [sg.id],
      keyName: this.keypair.keyName,
    });
    }
  }

const app = new App();
new MyStack(app, "cdktf-ts");
app.synth();
