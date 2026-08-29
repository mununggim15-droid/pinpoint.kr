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

        const apiKey = process.env.OPENAI_API_KEY;

        if (!apiKey) {
            return res.status(500).json({
                error: "OPENAI_API_KEY 환경 변수를 찾을 수 없습니다."
            });
        }

        const openaiResponse = await fetch(
            "https://api.openai.com/v1/responses",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: "gpt-4.1-mini",
                    input: [{
                        role: "user",
                        content: [
                            {
                                type: "input_text",
                                text: `사진 속 장소를 분석해 주세요.

사진에서 실제로 보이는 건물, 간판, 도로 표지판, 랜드마크, 지형 등을 근거로 장소를 추정하세요.

추측으로 사실을 만들어내지 마세요. 정확한 장소를 알 수 없으면 특정하기 어렵다고 답하세요.

반드시 아래 JSON 형식으로만 답하세요:
{
  "place": "추정 장소 이름 또는 특정하기 어려움",
  "region": "도시 또는 지역",
  "confidence": "0~100%",
  "description": "사진에서 발견한 근거와 추정 이유"
}`
                            },
                            {
                                type: "input_image",
                                image_url: image
                            }
                        ]
                    }]
                })
            }
        );

        const openaiData = await openaiResponse.json();

        if (!openaiResponse.ok) {
            console.error(openaiData);

            return res.status(500).json({
                error: "OpenAI API 오류가 발생했습니다."
            });
        }

        const text = openaiData.output_text;

        if (!text) {
            throw new Error("AI 응답이 비어 있습니다.");
        }

        let result;

        try {
            const match = text.match(/\{[\s\S]*\}/);
            result = JSON.parse(match ? match[0] : text);
        } catch {
            result = {
                place: "특정하기 어려움",
                region: "알 수 없음",
                confidence: "알 수 없음",
                description: text
            };
        }

        return res.status(200).json(result);

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            error: "서버 오류: " + error.message
        });
    }
}
