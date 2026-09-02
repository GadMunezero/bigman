import { listChallengeRecords } from "@/lib/repo";
process.stdout.write(JSON.stringify(listChallengeRecords()));
