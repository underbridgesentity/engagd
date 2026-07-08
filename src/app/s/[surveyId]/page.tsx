import { getSurveyWithEvent, PublicSurveyPage } from "./survey-page";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ surveyId: string }>;
}) {
  const { surveyId } = await params;
  const row = await getSurveyWithEvent(surveyId);
  return { title: row ? row.survey.title : "Survey" };
}

export default async function AnonymousSurveyPage({
  params,
}: {
  params: Promise<{ surveyId: string }>;
}) {
  const { surveyId } = await params;
  return <PublicSurveyPage surveyId={surveyId} token={null} />;
}
