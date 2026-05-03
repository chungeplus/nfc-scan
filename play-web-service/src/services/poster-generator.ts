import { getCloudbaseApp } from './cloudbase';

export const POSTER_PROMPTS: Record<string, string> = {
  main: `像素风格的产品宣传海报，8-bit复古游戏美术风格，温暖明亮色调。画面中央是一部智能手机，手机屏幕展示小程序界面：暖纸色背景，三张彩色像素风格的功能卡片：橙色应用卡、紫色音乐卡、青色网页卡，每张卡片有粗黑描边和硬阴影。手机左侧有一个 NFC 标签图标，手机右侧有无线电波连接到 NFC 标签，表示触碰连接的效果。整体背景是浅绿色场景色，带有稀疏的像素网格纹理。底部有像素风格的大标题文字："NFC卡片助手"，副标题："一碰即连 无限可能"。所有元素都有粗黑描边，使用硬阴影，不使用模糊效果。画面构图居中，视觉层次清晰，有复古游戏的可爱感但不幼稚。`,

  media: `像素风格的功能展示海报，8-bit复古游戏美术，温暖明亮色调。画面展示本地音视频功能场景：左侧是微信聊天界面，有音乐和视频文件图标；中间是一个像素风格的上传箭头，指向右侧的网页播放器；右侧是一个精美的视频播放器界面，有播放按钮、进度条、音量控制，播放器有三种主题风格切换效果。背景是暖纸色，底部有像素风格的大标题："本地音视频 一键分享"，副标题："上传音视频，生成播放链接，写入NFC"。所有组件都有粗黑描边，使用硬阴影，色彩活泼鲜艳。`,

  brand: `极简像素风格的品牌海报，8-bit复古像素艺术，温暖明亮。画面中央是一个精美的像素风格 Logo：一个 NFC 标签图标，上面叠加一个播放按钮的组合图形，Logo 有粗黑描边，使用橙、绿、蓝三色块填充。Logo 下方是大字号的像素字体标题："NFC卡片助手"，再下方是小字标语："让每一次触碰都有惊喜"。背景是纯净的暖纸色，带有轻微的像素颗粒纹理，四个角落有小巧的像素装饰元素。整体构图简洁、平衡，高辨识度。`,

  scene: `像素风格的使用场景插画海报，8-bit复古游戏美术，温馨明亮色调。画面展示三个使用场景，用路径连接起来：1. 左上角：一个人在办公室，用手机碰一下 NFC 卡片，快速打开工作应用；2. 中间：一个人在家中，碰 NFC 卡片播放喜欢的音乐；3. 右下角：一个人在咖啡馆，碰 NFC 卡片分享视频给朋友。每个场景都有简单的像素风格人物和环境元素。底部有大标题："NFC 让生活更简单"，副标题："办公 · 娱乐 · 分享，一碰即达"。`,
};

export interface GeneratePosterOptions {
  posterType: string;
  size?: string;
  style?: string;
}

export interface GeneratePosterResult {
  success: boolean;
  data?: {
    imageUrl: string;
    revisedPrompt: string;
    posterType: string;
  };
  error?: {
    message: string;
    code?: string;
    details?: string;
  };
}

export class PosterGeneratorError extends Error {
  code: string;
  statusCode: number;

  constructor(message: string, code: string = 'GENERATE_ERROR', statusCode: number = 500) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.name = 'PosterGeneratorError';
  }
}

export async function generatePoster(options: GeneratePosterOptions): Promise<GeneratePosterResult> {
  const { posterType = 'main', size = '1024x1024' } = options;

  try {
    const app = getCloudbaseApp();
    const ai = app.ai();

    const prompt = POSTER_PROMPTS[posterType] || POSTER_PROMPTS.main;

    console.log('[海报生成] 开始生成，类型:', posterType, '尺寸:', size);
    console.log('[海报生成] Prompt:', `${prompt.substring(0, 100)}...`);

    const imageModel = ai.createImageModel('hunyuan-image');

    const result = await imageModel.generateImage({
      model: 'hunyuan-image',
      prompt,
      size,
      n: 1,
    }) as any;

    console.log('[海报生成] API完整响应:', JSON.stringify(result, null, 2));

    if (!result) {
      throw new PosterGeneratorError('API返回空结果', 'EMPTY_RESPONSE');
    }

    if (result.data && Array.isArray(result.data) && result.data.length > 0) {
      const imageData = result.data[0];
      console.log('[海报生成] 图片数据:', imageData);

      const imageUrl = imageData.url || imageData.image_url || imageData.imageUrl;
      if (!imageUrl) {
        throw new PosterGeneratorError('返回数据中没有图片URL', 'NO_IMAGE_URL');
      }

      return {
        success: true,
        data: {
          imageUrl,
          revisedPrompt: imageData.revised_prompt || imageData.revisedPrompt || prompt,
          posterType,
        },
      };
    }
    else if (result.Response && result.Response.Data && result.Response.Data.length > 0) {
      const imageData = result.Response.Data[0];
      console.log('[海报生成] 腾讯云格式图片数据:', imageData);

      const imageUrl = imageData.Url || imageData.url;
      if (!imageUrl) {
        throw new PosterGeneratorError('返回数据中没有图片URL', 'NO_IMAGE_URL');
      }

      return {
        success: true,
        data: {
          imageUrl,
          revisedPrompt: prompt,
          posterType,
        },
      };
    }
    else {
      console.error('[海报生成] 数据格式不匹配:', result);
      throw new PosterGeneratorError('返回数据格式不匹配，data 不是有效数组', 'INVALID_DATA_FORMAT');
    }
  }
  catch (error) {
    console.error('[海报生成] 详细错误:', error);

    let errorMessage = '未知错误';
    let errorCode = 'GENERATE_ERROR';

    if (error instanceof Error) {
      errorMessage = error.message;
    }

    if (error instanceof PosterGeneratorError) {
      errorCode = error.code;
    }

    let errorDetails = '';
    try {
      errorDetails = JSON.stringify(error);
    }
    catch {
      errorDetails = String(error);
    }

    return {
      success: false,
      error: {
        message: errorMessage,
        code: errorCode,
        details: errorDetails,
      },
    };
  }
}

export function getAvailablePosterTypes(): Array<{ type: string; name: string; description: string }> {
  return [
    {
      type: 'main',
      name: '主视觉海报',
      description: '产品核心功能展示，像素风格手机界面 + NFC场景',
    },
    {
      type: 'media',
      name: '本地音视频',
      description: '新功能推广海报，上传 - 生成链接 - 播放流程',
    },
    {
      type: 'brand',
      name: '品牌简约',
      description: '极简 Logo + 标语，适合头像和品牌展示',
    },
    {
      type: 'scene',
      name: '使用场景',
      description: '办公、娱乐、分享三大使用场景插画',
    },
  ];
}
