import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  // POST 요청만 허용
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "POST 요청만 사용할 수 있습니다.",
    });
  }

  try {
    const { image } = req.body;

    if (!image) {
      return res.status(400).json({
        error: "이미지가 없습니다.",
      });
    }

    const response = await openai.responses.create({
      model: "gpt-5.6-luna",
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `너는 사진 속 장소를 분석하는 AI다.

사진에 보이는 건물, 간판, 도로 표지판, 랜드마크, 지형, 주변 환경 등을 종합적으로 분석해서 이 사진이 촬영된 장소를 추정해.

중요한 규칙:
- 사진에 실제로 보이는 정보만 근거로 사용해.
- 확실하지 않은 정보를 지어내지 마.
- 장소를 특정할 수 없다면 "특정하기 어려움"이라고 말해.
- 가능하면 장소의 이름과 지역을 알려줘.
- 확신도는 0~100 사이의 숫자로 알려줘.

반드시 아래 JSON 형식으로만 답변해:
{
  "place": "추정 장소 이름 또는 특정하기 어려움",
  "region": "도시 또는 지역",
  "confidence": "85%",
  "description": "사진에서 발견한 근거와 추정 이유"
}`,
            },
            {
              type: "input_image",
              image_url: image,
            },
          ],
        },
      ],
    });

    const text = response.output_text;

    // AI가 JSON 앞뒤에 다른 글자를 붙였을 경우를 대비
    let result;

    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      result = JSON.parse(jsonMatch ? jsonMatch[0] : text);
    } catch (parseError) {
      result = {
        place: "특정하기 어려움",
        region: "알 수 없음",
        confidence: "알 수 없음",
        description: text,
      };
    }

    return res.status(200).json(result);

  } catch (error) {
    console.error("AI 분석 오류:", error);

    return res.status(500).json({
      error: "AI 분석 중 오류가 발생했습니다.",
    });
  }
}
