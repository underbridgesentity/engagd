import { getSurveyWithEvent, PublicSurveyPage } from "../survey-page";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ surveyId: string; token: string }>;
}) {
  const { surveyId } = await params;
  const row = await getSurveyWithEvent(surveyId);
  return { title: row ? row.survey.title : "Survey" };
}

export default async function PersonalisedSurveyPage({
  params,
}: {
  params: Promise<{ surveyId: string; token: string }>;
}) {
  const { surveyId, token } = await params;
  return <PublicSurveyPage surveyId={surveyId} token={token} />;
}
