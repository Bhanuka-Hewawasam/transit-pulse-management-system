import requests

invoke_url = "https://integrate.api.nvidia.com/v1/chat/completions"
stream = True

headers = {
    "Authorization": "Bearer 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",
    "Accept": "text/event-stream" if stream else "application/json",
}

payload = {
  "messages": [
    {
      "role": "user",
      "content": [
        {
          "type": "text",
          "text": "What is in this image?"
        },
        {
          "type": "image_url",
          "image_url": {
            "url": "https://assets.ngc.nvidia.com/products/api-catalog/phi-3-5-vision/example1b.jpg"
          }
        }
      ]
    }
  ],
  "model": "microsoft/phi-3.5-vision-instruct", # නිවැරදි Model ID එක
  "max_tokens": 1024,
  "stream": stream,
  "temperature": 1
}

response = requests.post(invoke_url, headers=headers, json=payload, stream=stream)

if stream:
    for line in response.iter_lines():
        if line:
            print(line.decode("utf-8"))
else:
    print(response.json())