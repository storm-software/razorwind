{ inputs, ... }:
{
  name = "storm-software/razorwind";

  dotenv.enable = true;
  dotenv.filename = [
    ".env"
    ".env.local"
  ];
  dotenv.disableHint = true;
}
