{ inputs, ... }:
{
  name = "storm-software/windie";

  dotenv.enable = true;
  dotenv.filename = [
    ".env"
    ".env.local"
  ];
  dotenv.disableHint = true;
}
