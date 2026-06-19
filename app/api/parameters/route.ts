import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { getInfo, isDifyConfigured, requireDifyClient, setSession } from '@/app/api/utils/common'

const demoParameters = {
  opening_statement: '你好，我是你的计算机网络学习助手。你可以问概念、发题目、生成练习，或让我根据学习记录建议下一步。',
  suggested_questions: [
    '最长前缀匹配到底怎么判断？',
    '给我出 3 道 CIDR 练习题',
    '根据我的学习记录建议下一步',
  ],
  user_input_form: [],
  file_upload: {
    enabled: false,
    image: {
      enabled: false,
      number_limits: 2,
      transfer_methods: ['local_file'],
    },
  },
  system_parameters: {
    image_file_size_limit: 10,
  },
}

export async function GET(request: NextRequest) {
  const { sessionId, user } = getInfo(request)
  if (!isDifyConfigured) {
    return NextResponse.json(demoParameters, {
      headers: setSession(sessionId),
    })
  }
  try {
    const { data } = await requireDifyClient().getApplicationParameters(user)
    return NextResponse.json(data as object, {
      headers: setSession(sessionId),
    })
  }
  catch (error) {
    return NextResponse.json([])
  }
}
