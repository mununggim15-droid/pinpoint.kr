export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({
            error: "POST 요청만 사용할 수 있습니다."
        });
    }

    try {
        const { image } = req.body || {};

        if (!image) {
            return res.status(400).json({
                error: "이미지가 전달되지 않았습니다."
            });
        }

        if (!process.env.OPENAI_API_KEY) {
            return res.status(500).json({
                error: "OPENAI_API_KEY가 Vercel에 설정되지 않았습니다."
            });
        }

        // OpenAI API에 사진 분석 요청
        const openaiResponse = await fetch(
            "https://api.openai.com/v1/responses",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
                },
                body: JSON.stringify({
                    model: "gpt-5.6-luna",
                    input: [
                        {
                            role: "user",
                            content: [
                                {
                                    type: "input_text",
                                    text: `너는 사진 속 장소를 분석하는 AI다.

사진에 실제로 보이는 정보만 이용해서 이 사진이 촬영된 장소를 추정해.

다음 요소를 분석해:
- 건물과 건축 양식
- 간판이나 읽을 수 있는 글자
- 도로 표지판
- 랜드마크
- 산, 바다, 강 등의 지형
- 주변 환경

중요한 규칙:
- 확실하지 않은 내용을 지어내지 마.
- 장소를 정확히 특정할 수 없다면 가장 가능성 높은 후보라고 설명해.
- 사진만으로 판단하기 어려우면 솔직하게 "특정하기 어려움"이라고 말해.

반드시 아래 형식의 JSON만 출력해. 다른 문장은 절대 추가하지 마.

{
  "place": "추정 장소 이름 또는 특정하기 어려움",
  "region": "도시 또는 지역",
  "confidence": "0~100%",
  "description": "사진에서 발견한 근거와 장소를 추정한 이유"
}`
                                },
                                {
                                    type: "input_image",
                                    image_url: image,
                                    detail: "high"
                                }
                            ]
                        }
                    ]
                })
            }
        );

        // OpenAI에서 오류가 발생한 경우
        if (!openaiResponse.ok) {
            const errorText = await openaiResponse.text();

            console.error("OpenAI 오류:", errorText);

            return res.status(500).json({
                error: "AI 분석 서버 오류: " + errorText
            });
        }

        const openaiData = await openaiResponse.json();
        const text = openaiData.output_text;

        if (!text) {
            return res.status(500).json({
                error: "AI가 분석 결과를 반환하지 않았습니다."
            });
        }

        // AI 응답에서 JSON 추출
        let result;

        try {
            const jsonMatch = text.match(/\{[\s\S]*\}/);

            if (!jsonMatch) {
                throw new Error("JSON을 찾을 수 없습니다.");
            }

            result = JSON.parse(jsonMatch[0]);

        } catch (error) {
            console.error("AI 응답 파싱 오류:", text);

            result = {
                place: "특정하기 어려움",
                region: "알 수 없음",
                confidence: "알 수 없음",
                description: text
            };
        }

        return res.status(200).json(result);

    } catch (error) {
        console.error("서버 오류:", error);

        return res.status(500).json({
            error: "서버 오류가 발생했습니다: " + error.message
        });
    }
}
