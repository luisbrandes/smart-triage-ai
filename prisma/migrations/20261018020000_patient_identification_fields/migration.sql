ALTER TABLE "Patient" ADD COLUMN "cpf" TEXT;
ALTER TABLE "Patient" ADD COLUMN "phone" TEXT;
ALTER TABLE "Patient" ADD COLUMN "email" TEXT;
ALTER TABLE "Patient" ADD COLUMN "motherName" TEXT;
ALTER TABLE "Patient" ADD COLUMN "legalRepresentativeName" TEXT;
ALTER TABLE "Patient" ADD COLUMN "legalRepresentativePhone" TEXT;

CREATE UNIQUE INDEX "Patient_cpf_key" ON "Patient"("cpf");
