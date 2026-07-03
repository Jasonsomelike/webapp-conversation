import type { RawHierarchyEdge, RawHierarchyNode } from '@/lib/hierarchical-graph'

export const textbookReviewGraphRootNodeId = 'review-0'

export const textbookReviewGraphNodes = [
  {
    id: 'review-0',
    label: '计算机网络',
    depth: 0,
  },
  {
    id: 'review-1',
    label: '概述',
    depth: 1,
  },
  {
    id: 'review-2',
    label: '三网融合',
    depth: 2,
  },
  {
    id: 'review-3',
    label: '有线电视网络',
    depth: 3,
  },
  {
    id: 'review-4',
    label: '广播网络',
    depth: 3,
  },
  {
    id: 'review-5',
    label: '计算机网络',
    depth: 3,
  },
  {
    id: 'review-6',
    label: 'Interner和internet',
    depth: 2,
  },
  {
    id: 'review-7',
    label: 'Internet',
    depth: 2,
  },
  {
    id: 'review-8',
    label: '连通性',
    depth: 3,
  },
  {
    id: 'review-9',
    label: '资源共享',
    depth: 3,
  },
  {
    id: 'review-10',
    label: '计算机网络、互连网、互联网(*)',
    depth: 2,
  },
  {
    id: 'review-11',
    label: '计算机网络发展',
    depth: 2,
  },
  {
    id: 'review-12',
    label: '主机为中心',
    depth: 3,
  },
  {
    id: 'review-13',
    label: '以分组交换网为中心',
    depth: 3,
  },
  {
    id: 'review-14',
    label: '互联网发展的三个阶段',
    depth: 2,
  },
  {
    id: 'review-15',
    label: 'ARPANET',
    depth: 3,
  },
  {
    id: 'review-16',
    label: '三级结构',
    depth: 3,
  },
  {
    id: 'review-17',
    label: '多层次ISP结构',
    depth: 3,
  },
  {
    id: 'review-18',
    label: '互联网的组成',
    depth: 2,
  },
  {
    id: 'review-19',
    label: '边缘部分',
    depth: 3,
  },
  {
    id: 'review-20',
    label: '核心部分',
    depth: 3,
  },
  {
    id: 'review-21',
    label: '两种通信方式',
    depth: 2,
  },
  {
    id: 'review-22',
    label: 'C/S',
    depth: 3,
  },
  {
    id: 'review-23',
    label: 'P2P',
    depth: 3,
  },
  {
    id: 'review-24',
    label: '交换技术(*)',
    depth: 2,
  },
  {
    id: 'review-25',
    label: '电路交换',
    depth: 3,
  },
  {
    id: 'review-26',
    label: '报文交换',
    depth: 3,
  },
  {
    id: 'review-27',
    label: '分组交换',
    depth: 3,
  },
  {
    id: 'review-28',
    label: '计算机网络分类',
    depth: 2,
  },
  {
    id: 'review-29',
    label: '按地域规模',
    depth: 3,
  },
  {
    id: 'review-30',
    label: 'PAN',
    depth: 4,
  },
  {
    id: 'review-31',
    label: 'LAN',
    depth: 4,
  },
  {
    id: 'review-32',
    label: 'MAN',
    depth: 4,
  },
  {
    id: 'review-33',
    label: 'WAN',
    depth: 4,
  },
  {
    id: 'review-34',
    label: '按使用者',
    depth: 3,
  },
  {
    id: 'review-35',
    label: '公用网',
    depth: 4,
  },
  {
    id: 'review-36',
    label: '专用网',
    depth: 4,
  },
  {
    id: 'review-37',
    label: '计算机网络性能指标(**)',
    depth: 2,
  },
  {
    id: 'review-38',
    label: '速率',
    depth: 3,
  },
  {
    id: 'review-39',
    label: 'bit/s',
    depth: 4,
  },
  {
    id: 'review-40',
    label: '1Gbit/s = 1000Mbit/s 1Mbit/s = 1000Kbit/s 1Kbit/s = 1000bit/s',
    depth: 4,
  },
  {
    id: 'review-41',
    label: '定义',
    depth: 4,
  },
  {
    id: 'review-42',
    label: '带宽',
    depth: 3,
  },
  {
    id: 'review-43',
    label: 'bit/s或Hz',
    depth: 4,
  },
  {
    id: 'review-44',
    label: '1Gbit/s = 1000Mbit/s 1Mbit/s = 1000Kbit/s 1Kbit/s = 1000bit/s',
    depth: 4,
  },
  {
    id: 'review-45',
    label: '定义',
    depth: 4,
  },
  {
    id: 'review-46',
    label: '吞吐量',
    depth: 3,
  },
  {
    id: 'review-47',
    label: 'bit/s',
    depth: 4,
  },
  {
    id: 'review-48',
    label: '1Gbit/s = 1000Mbit/s 1Mbit/s = 1000Kbit/s 1Kbit/s = 1000bit/s',
    depth: 4,
  },
  {
    id: 'review-49',
    label: '定义',
    depth: 4,
  },
  {
    id: 'review-50',
    label: '时延',
    depth: 3,
  },
  {
    id: 'review-51',
    label: 's',
    depth: 4,
  },
  {
    id: 'review-52',
    label: '发送时延',
    depth: 4,
  },
  {
    id: 'review-53',
    label: '传播时延',
    depth: 4,
  },
  {
    id: 'review-54',
    label: '与传播介质有关',
    depth: 5,
  },
  {
    id: 'review-55',
    label: '排队时延',
    depth: 4,
  },
  {
    id: 'review-56',
    label: '处理时延',
    depth: 4,
  },
  {
    id: 'review-57',
    label: '定义',
    depth: 4,
  },
  {
    id: 'review-58',
    label: '时延带宽积',
    depth: 3,
  },
  {
    id: 'review-59',
    label: 'bit',
    depth: 4,
  },
  {
    id: 'review-60',
    label: '1B = 8bit 1KB = 1024B 1MB = 1024KB 1GB = 1024MB',
    depth: 4,
  },
  {
    id: 'review-61',
    label: '定义',
    depth: 4,
  },
  {
    id: 'review-62',
    label: '往返时间RTT',
    depth: 3,
  },
  {
    id: 'review-63',
    label: 's',
    depth: 4,
  },
  {
    id: 'review-64',
    label: '定义',
    depth: 4,
  },
  {
    id: 'review-65',
    label: '利用率',
    depth: 3,
  },
  {
    id: 'review-66',
    label: '无单位，百分数',
    depth: 4,
  },
  {
    id: 'review-67',
    label: '定义',
    depth: 4,
  },
  {
    id: 'review-68',
    label: '计算机网络体系结构(*)',
    depth: 2,
  },
  {
    id: 'review-69',
    label: 'OSI的ISO',
    depth: 3,
  },
  {
    id: 'review-70',
    label: '应用层',
    depth: 4,
  },
  {
    id: 'review-71',
    label: '表示层',
    depth: 4,
  },
  {
    id: 'review-72',
    label: '会话层',
    depth: 4,
  },
  {
    id: 'review-73',
    label: '传输层',
    depth: 4,
  },
  {
    id: 'review-74',
    label: '网络层',
    depth: 4,
  },
  {
    id: 'review-75',
    label: '数据链路层',
    depth: 4,
  },
  {
    id: 'review-76',
    label: '物理层',
    depth: 4,
  },
  {
    id: 'review-77',
    label: 'TCP/IP',
    depth: 3,
  },
  {
    id: 'review-78',
    label: '应用层',
    depth: 4,
  },
  {
    id: 'review-79',
    label: '传输层',
    depth: 4,
  },
  {
    id: 'review-80',
    label: '互联层',
    depth: 4,
  },
  {
    id: 'review-81',
    label: '主机-网络层',
    depth: 4,
  },
  {
    id: 'review-82',
    label: '五层体系结构',
    depth: 3,
  },
  {
    id: 'review-83',
    label: '应用层',
    depth: 4,
  },
  {
    id: 'review-84',
    label: 'PDU：报文',
    depth: 5,
  },
  {
    id: 'review-85',
    label: '传输层',
    depth: 4,
  },
  {
    id: 'review-86',
    label: 'PDU：TCP报文段或用户数据报',
    depth: 5,
  },
  {
    id: 'review-87',
    label: '网络层',
    depth: 4,
  },
  {
    id: 'review-88',
    label: 'PDU：IP数据报',
    depth: 5,
  },
  {
    id: 'review-89',
    label: '数据链路层',
    depth: 4,
  },
  {
    id: 'review-90',
    label: 'PDU：数据帧',
    depth: 5,
  },
  {
    id: 'review-91',
    label: '物理层',
    depth: 4,
  },
  {
    id: 'review-92',
    label: 'PDU：比特或比特流',
    depth: 5,
  },
  {
    id: 'review-93',
    label: '协议三要素',
    depth: 2,
  },
  {
    id: 'review-94',
    label: '语法',
    depth: 3,
  },
  {
    id: 'review-95',
    label: '语义',
    depth: 3,
  },
  {
    id: 'review-96',
    label: '同步',
    depth: 3,
  },
  {
    id: 'review-97',
    label: '服务数据单元SDU、服务访问点SAP、协议控制信息PCI',
    depth: 2,
  },
  {
    id: 'review-98',
    label: '面向连接的服务',
    depth: 2,
  },
  {
    id: 'review-99',
    label: '连接建立',
    depth: 3,
  },
  {
    id: 'review-100',
    label: '连接维护',
    depth: 3,
  },
  {
    id: 'review-101',
    label: '连接释放',
    depth: 3,
  },
  {
    id: 'review-102',
    label: '物理层',
    depth: 1,
  },
  {
    id: 'review-103',
    label: '术语(*)',
    depth: 2,
  },
  {
    id: 'review-104',
    label: '信号',
    depth: 3,
  },
  {
    id: 'review-105',
    label: '模拟信号',
    depth: 4,
  },
  {
    id: 'review-106',
    label: '数字信号',
    depth: 4,
  },
  {
    id: 'review-107',
    label: '码元',
    depth: 3,
  },
  {
    id: 'review-108',
    label: '定义',
    depth: 4,
  },
  {
    id: 'review-109',
    label: '接口特性',
    depth: 2,
  },
  {
    id: 'review-110',
    label: '机械特性',
    depth: 3,
  },
  {
    id: 'review-111',
    label: '电气特性',
    depth: 3,
  },
  {
    id: 'review-112',
    label: '功能特性',
    depth: 3,
  },
  {
    id: 'review-113',
    label: '过程特性',
    depth: 3,
  },
  {
    id: 'review-114',
    label: '通信类型',
    depth: 2,
  },
  {
    id: 'review-115',
    label: '单工通信',
    depth: 3,
  },
  {
    id: 'review-116',
    label: '半双工通信',
    depth: 3,
  },
  {
    id: 'review-117',
    label: '双工通信',
    depth: 3,
  },
  {
    id: 'review-118',
    label: '调制(*)',
    depth: 2,
  },
  {
    id: 'review-119',
    label: '基带调制（编码）',
    depth: 3,
  },
  {
    id: 'review-120',
    label: '不归零制',
    depth: 4,
  },
  {
    id: 'review-121',
    label: '归零制',
    depth: 4,
  },
  {
    id: 'review-122',
    label: '曼彻斯特编码（自同步能力）',
    depth: 4,
  },
  {
    id: 'review-123',
    label: '差分曼彻斯特编码（自同步能力）',
    depth: 4,
  },
  {
    id: 'review-124',
    label: '带通调制',
    depth: 3,
  },
  {
    id: 'review-125',
    label: '调幅',
    depth: 4,
  },
  {
    id: 'review-126',
    label: '调频',
    depth: 4,
  },
  {
    id: 'review-127',
    label: '调相',
    depth: 4,
  },
  {
    id: 'review-128',
    label: '正交振幅调制QAM',
    depth: 2,
  },
  {
    id: 'review-129',
    label: '奈氏准则（无噪声理想情况）',
    depth: 2,
  },
  {
    id: 'review-130',
    label: 'C = 2W （码元/秒）',
    depth: 3,
  },
  {
    id: 'review-131',
    label: '信噪比',
    depth: 2,
  },
  {
    id: 'review-132',
    label: '10log10（S/N）(dB)',
    depth: 3,
  },
  {
    id: 'review-133',
    label: '香农定理（有噪声情况）',
    depth: 2,
  },
  {
    id: 'review-134',
    label: 'C = W log2(1+S/N) (bit/s)',
    depth: 3,
  },
  {
    id: 'review-135',
    label: '传输介质(*)',
    depth: 2,
  },
  {
    id: 'review-136',
    label: '导引型传输介质',
    depth: 3,
  },
  {
    id: 'review-137',
    label: '双绞线',
    depth: 4,
  },
  {
    id: 'review-138',
    label: 'STP',
    depth: 5,
  },
  {
    id: 'review-139',
    label: 'UTP',
    depth: 5,
  },
  {
    id: 'review-140',
    label: '绞合目的',
    depth: 5,
  },
  {
    id: 'review-141',
    label: '同轴电缆',
    depth: 4,
  },
  {
    id: 'review-142',
    label: '50欧姆',
    depth: 5,
  },
  {
    id: 'review-143',
    label: '75欧姆',
    depth: 5,
  },
  {
    id: 'review-144',
    label: '光缆',
    depth: 4,
  },
  {
    id: 'review-145',
    label: '单模光纤',
    depth: 5,
  },
  {
    id: 'review-146',
    label: '多模光纤',
    depth: 5,
  },
  {
    id: 'review-147',
    label: '非导引型传输介质',
    depth: 3,
  },
  {
    id: 'review-148',
    label: '短波通信',
    depth: 4,
  },
  {
    id: 'review-149',
    label: '无线电',
    depth: 5,
  },
  {
    id: 'review-150',
    label: '微波通信',
    depth: 4,
  },
  {
    id: 'review-151',
    label: '地面微波接力通信',
    depth: 5,
  },
  {
    id: 'review-152',
    label: 'WIFI',
    depth: 6,
  },
  {
    id: 'review-153',
    label: '蜂窝',
    depth: 6,
  },
  {
    id: 'review-154',
    label: '卫星通信',
    depth: 5,
  },
  {
    id: 'review-155',
    label: '信道复用',
    depth: 2,
  },
  {
    id: 'review-156',
    label: '频分复用FDM',
    depth: 3,
  },
  {
    id: 'review-157',
    label: '时分复用TDM',
    depth: 3,
  },
  {
    id: 'review-158',
    label: '统计时分复用STDM',
    depth: 4,
  },
  {
    id: 'review-159',
    label: '波分复用WDM',
    depth: 3,
  },
  {
    id: 'review-160',
    label: '光的频分复用',
    depth: 4,
  },
  {
    id: 'review-161',
    label: '码分复用CDM',
    depth: 3,
  },
  {
    id: 'review-162',
    label: '码分多址CDMA',
    depth: 4,
  },
  {
    id: 'review-163',
    label: '码片',
    depth: 5,
  },
  {
    id: 'review-164',
    label: '脉冲编码调制',
    depth: 2,
  },
  {
    id: 'review-165',
    label: '采样',
    depth: 3,
  },
  {
    id: 'review-166',
    label: '量化',
    depth: 3,
  },
  {
    id: 'review-167',
    label: '编码',
    depth: 3,
  },
  {
    id: 'review-168',
    label: '模拟信号转化为数字信号',
    depth: 3,
  },
  {
    id: 'review-169',
    label: '64Kbit/s',
    depth: 3,
  },
  {
    id: 'review-170',
    label: '北美24路PCM（T1、时分复用）',
    depth: 3,
  },
  {
    id: 'review-171',
    label: '1.544 Mb/s',
    depth: 4,
  },
  {
    id: 'review-172',
    label: '欧洲32路PCM（E1、时分复用）',
    depth: 3,
  },
  {
    id: 'review-173',
    label: '2.048 Mb/s',
    depth: 4,
  },
  {
    id: 'review-174',
    label: '同步光纤网SONET',
    depth: 3,
  },
  {
    id: 'review-175',
    label: '51.84Mbit/s（T3、E3）',
    depth: 4,
  },
  {
    id: 'review-176',
    label: 'STS-1 电信号',
    depth: 4,
  },
  {
    id: 'review-177',
    label: 'OC-1 光信号',
    depth: 4,
  },
  {
    id: 'review-178',
    label: '同步数字系列SDH',
    depth: 3,
  },
  {
    id: 'review-179',
    label: '155.52Mbit/s',
    depth: 4,
  },
  {
    id: 'review-180',
    label: 'STM-1（OC-3）',
    depth: 4,
  },
  {
    id: 'review-181',
    label: '宽带接入',
    depth: 2,
  },
  {
    id: 'review-182',
    label: '有线宽带接入',
    depth: 3,
  },
  {
    id: 'review-183',
    label: '非对称用户数字线ADSL',
    depth: 4,
  },
  {
    id: 'review-184',
    label: '光纤同轴混合网HFC',
    depth: 4,
  },
  {
    id: 'review-185',
    label: 'FTTx',
    depth: 4,
  },
  {
    id: 'review-186',
    label: '无线宽带接入',
    depth: 3,
  },
  {
    id: 'review-187',
    label: '数据链路层',
    depth: 1,
  },
  {
    id: 'review-188',
    label: '信道分类',
    depth: 2,
  },
  {
    id: 'review-189',
    label: '点对点信道',
    depth: 3,
  },
  {
    id: 'review-190',
    label: '广播信道',
    depth: 3,
  },
  {
    id: 'review-191',
    label: '三个基本问题(*)',
    depth: 2,
  },
  {
    id: 'review-192',
    label: '封装成帧',
    depth: 3,
  },
  {
    id: 'review-193',
    label: '首部+尾部（帧定界）',
    depth: 4,
  },
  {
    id: 'review-194',
    label: '透明传输',
    depth: 3,
  },
  {
    id: 'review-195',
    label: '字节填充',
    depth: 4,
  },
  {
    id: 'review-196',
    label: '字符填充',
    depth: 4,
  },
  {
    id: 'review-197',
    label: '为什么需要透明传输',
    depth: 4,
  },
  {
    id: 'review-198',
    label: '差错控制',
    depth: 3,
  },
  {
    id: 'review-199',
    label: '循环冗余校验CRC(**)',
    depth: 4,
  },
  {
    id: 'review-200',
    label: '点对点信道协议',
    depth: 2,
  },
  {
    id: 'review-201',
    label: '面向字符型',
    depth: 3,
  },
  {
    id: 'review-202',
    label: '帧为整数字节',
    depth: 4,
  },
  {
    id: 'review-203',
    label: '特定字符标识帧开始和结束',
    depth: 4,
  },
  {
    id: 'review-204',
    label: '点对点协议PPP',
    depth: 4,
  },
  {
    id: 'review-205',
    label: '链路控制协议LCP',
    depth: 5,
  },
  {
    id: 'review-206',
    label: '网络控制协议NCP',
    depth: 5,
  },
  {
    id: 'review-207',
    label: '帧格式',
    depth: 5,
  },
  {
    id: 'review-208',
    label: '透明传输',
    depth: 5,
  },
  {
    id: 'review-209',
    label: '零比特填充法（同步传输）',
    depth: 6,
  },
  {
    id: 'review-210',
    label: '字节填充法（异步传输）',
    depth: 6,
  },
  {
    id: 'review-211',
    label: '认证',
    depth: 5,
  },
  {
    id: 'review-212',
    label: 'PAP（明文）',
    depth: 6,
  },
  {
    id: 'review-213',
    label: 'CHAP（MD5）',
    depth: 6,
  },
  {
    id: 'review-214',
    label: '面向比特型',
    depth: 3,
  },
  {
    id: 'review-215',
    label: '帧为任意比特',
    depth: 4,
  },
  {
    id: 'review-216',
    label: '约定位组合模式标识帧开始和结束',
    depth: 4,
  },
  {
    id: 'review-217',
    label: 'HDLC',
    depth: 4,
  },
  {
    id: 'review-218',
    label: '广播信道协议',
    depth: 2,
  },
  {
    id: 'review-219',
    label: '两个标准(*)',
    depth: 3,
  },
  {
    id: 'review-220',
    label: 'IEEE 802.3',
    depth: 4,
  },
  {
    id: 'review-221',
    label: 'DIX Ethernet v2',
    depth: 4,
  },
  {
    id: 'review-222',
    label: '两个子层',
    depth: 3,
  },
  {
    id: 'review-223',
    label: '逻辑链路控制LLC',
    depth: 4,
  },
  {
    id: 'review-224',
    label: '媒体接入控制MAC',
    depth: 4,
  },
  {
    id: 'review-225',
    label: 'CSMA/CD(**)',
    depth: 3,
  },
  {
    id: 'review-226',
    label: '多点接入',
    depth: 4,
  },
  {
    id: 'review-227',
    label: '载波监听',
    depth: 4,
  },
  {
    id: 'review-228',
    label: '碰撞检测',
    depth: 4,
  },
  {
    id: 'review-229',
    label: '二进制指数退避',
    depth: 5,
  },
  {
    id: 'review-230',
    label: '争用期',
    depth: 5,
  },
  {
    id: 'review-231',
    label: '51.2μs（64字节）',
    depth: 6,
  },
  {
    id: 'review-232',
    label: '定义',
    depth: 6,
  },
  {
    id: 'review-233',
    label: '最短有效帧长（64字节）—最长网络直径',
    depth: 5,
  },
  {
    id: 'review-234',
    label: '强化碰撞',
    depth: 4,
  },
  {
    id: 'review-235',
    label: '以太网类型',
    depth: 2,
  },
  {
    id: 'review-236',
    label: '星型以太网10BASE-T',
    depth: 3,
  },
  {
    id: 'review-237',
    label: '10BASE2',
    depth: 3,
  },
  {
    id: 'review-238',
    label: '10BASE5',
    depth: 3,
  },
  {
    id: 'review-239',
    label: '集线器',
    depth: 2,
  },
  {
    id: 'review-240',
    label: '工作在物理层',
    depth: 3,
  },
  {
    id: 'review-241',
    label: '逻辑上为总线型',
    depth: 3,
  },
  {
    id: 'review-242',
    label: '硬件地址MAC(*)',
    depth: 2,
  },
  {
    id: 'review-243',
    label: '相关概念',
    depth: 3,
  },
  {
    id: 'review-244',
    label: '48bit',
    depth: 3,
  },
  {
    id: 'review-245',
    label: 'OUI+EUI',
    depth: 3,
  },
  {
    id: 'review-246',
    label: 'I/G位',
    depth: 3,
  },
  {
    id: 'review-247',
    label: 'G/L位',
    depth: 3,
  },
  {
    id: 'review-248',
    label: '以太网帧格式(**)',
    depth: 2,
  },
  {
    id: 'review-249',
    label: '首部',
    depth: 3,
  },
  {
    id: 'review-250',
    label: '14字节',
    depth: 4,
  },
  {
    id: 'review-251',
    label: '尾部',
    depth: 3,
  },
  {
    id: 'review-252',
    label: '4字节',
    depth: 4,
  },
  {
    id: 'review-253',
    label: '扩展以太网(*)',
    depth: 2,
  },
  {
    id: 'review-254',
    label: '在物理层扩展以太网(*)',
    depth: 3,
  },
  {
    id: 'review-255',
    label: '光纤调制解调器',
    depth: 4,
  },
  {
    id: 'review-256',
    label: '集线器',
    depth: 4,
  },
  {
    id: 'review-257',
    label: '在数据链路层扩展以太网(*)',
    depth: 3,
  },
  {
    id: 'review-258',
    label: '网桥',
    depth: 4,
  },
  {
    id: 'review-259',
    label: '交换机(*)',
    depth: 4,
  },
  {
    id: 'review-260',
    label: '四大功能',
    depth: 5,
  },
  {
    id: 'review-261',
    label: '数据交换(*)',
    depth: 6,
  },
  {
    id: 'review-262',
    label: '存储转发',
    depth: 7,
  },
  {
    id: 'review-263',
    label: '直通方式',
    depth: 7,
  },
  {
    id: 'review-264',
    label: '改进的直通方式',
    depth: 7,
  },
  {
    id: 'review-265',
    label: '自学习MAC地址(**)',
    depth: 6,
  },
  {
    id: 'review-266',
    label: '自学习算法',
    depth: 7,
  },
  {
    id: 'review-267',
    label: '交换表',
    depth: 8,
  },
  {
    id: 'review-268',
    label: '避免广播风暴',
    depth: 6,
  },
  {
    id: 'review-269',
    label: 'STP协议',
    depth: 7,
  },
  {
    id: 'review-270',
    label: '分割碰撞域',
    depth: 6,
  },
  {
    id: 'review-271',
    label: '交换机每个端口都是一个冲突域',
    depth: 7,
  },
  {
    id: 'review-272',
    label: '碰撞域/冲突域(**)',
    depth: 3,
  },
  {
    id: 'review-273',
    label: '集线器不能分割冲突域',
    depth: 4,
  },
  {
    id: 'review-274',
    label: '交换机可以分割冲突域',
    depth: 4,
  },
  {
    id: 'review-275',
    label: '广播域(**)',
    depth: 3,
  },
  {
    id: 'review-276',
    label: '在不适用VLAN的情况下集线器和交换机都不可以分割广播域',
    depth: 4,
  },
  {
    id: 'review-277',
    label: '路由器可以分割广播域',
    depth: 4,
  },
  {
    id: 'review-278',
    label: 'VLAN(*)',
    depth: 3,
  },
  {
    id: 'review-279',
    label: '帧格式',
    depth: 4,
  },
  {
    id: 'review-280',
    label: '802.1Q(*)',
    depth: 5,
  },
  {
    id: 'review-281',
    label: 'trunk link',
    depth: 4,
  },
  {
    id: 'review-282',
    label: '划分方法',
    depth: 4,
  },
  {
    id: 'review-283',
    label: '基于端口的',
    depth: 5,
  },
  {
    id: 'review-284',
    label: '基于MAC地址的、基于协议类型的、基于高层应用的……',
    depth: 5,
  },
  {
    id: 'review-285',
    label: '子网隔离',
    depth: 4,
  },
  {
    id: 'review-286',
    label: '高速以太网',
    depth: 2,
  },
  {
    id: 'review-287',
    label: '100BASE-T',
    depth: 3,
  },
  {
    id: 'review-288',
    label: '吉比特以太网',
    depth: 3,
  },
  {
    id: 'review-289',
    label: '载波延伸',
    depth: 4,
  },
  {
    id: 'review-290',
    label: '分组突发',
    depth: 4,
  },
  {
    id: 'review-291',
    label: '10吉比特以太网',
    depth: 3,
  },
  {
    id: 'review-292',
    label: '使用以太网进行宽带接入',
    depth: 3,
  },
  {
    id: 'review-293',
    label: 'PPPoE',
    depth: 4,
  },
  {
    id: 'review-294',
    label: '网络层',
    depth: 1,
  },
  {
    id: 'review-295',
    label: '网络层提供两种类型的服务',
    depth: 2,
  },
  {
    id: 'review-296',
    label: '虚电路服务',
    depth: 3,
  },
  {
    id: 'review-297',
    label: '数据报服务',
    depth: 3,
  },
  {
    id: 'review-298',
    label: '网络层两个层面',
    depth: 2,
  },
  {
    id: 'review-299',
    label: '控制层面',
    depth: 3,
  },
  {
    id: 'review-300',
    label: '控制信息',
    depth: 4,
  },
  {
    id: 'review-301',
    label: '数据层面',
    depth: 3,
  },
  {
    id: 'review-302',
    label: '数据',
    depth: 4,
  },
  {
    id: 'review-303',
    label: 'IP地址(*)',
    depth: 2,
  },
  {
    id: 'review-304',
    label: '表示方法',
    depth: 3,
  },
  {
    id: 'review-305',
    label: '点分十进制',
    depth: 4,
  },
  {
    id: 'review-306',
    label: '32bit',
    depth: 4,
  },
  {
    id: 'review-307',
    label: '两级结构',
    depth: 4,
  },
  {
    id: 'review-308',
    label: '网络号',
    depth: 5,
  },
  {
    id: 'review-309',
    label: '主机号',
    depth: 5,
  },
  {
    id: 'review-310',
    label: '全0',
    depth: 6,
  },
  {
    id: 'review-311',
    label: '全1',
    depth: 6,
  },
  {
    id: 'review-312',
    label: '子网掩码',
    depth: 4,
  },
  {
    id: 'review-313',
    label: '合理的IP地址',
    depth: 4,
  },
  {
    id: 'review-314',
    label: '十六进制转换为十进制',
    depth: 4,
  },
  {
    id: 'review-315',
    label: '分类的IP地址',
    depth: 3,
  },
  {
    id: 'review-316',
    label: 'A类',
    depth: 4,
  },
  {
    id: 'review-317',
    label: '0',
    depth: 5,
  },
  {
    id: 'review-318',
    label: '0和127保留',
    depth: 6,
  },
  {
    id: 'review-319',
    label: 'B类',
    depth: 4,
  },
  {
    id: 'review-320',
    label: '10',
    depth: 5,
  },
  {
    id: 'review-321',
    label: '128.0保留',
    depth: 6,
  },
  {
    id: 'review-322',
    label: 'C类',
    depth: 4,
  },
  {
    id: 'review-323',
    label: '110',
    depth: 5,
  },
  {
    id: 'review-324',
    label: '192.0.0保留',
    depth: 6,
  },
  {
    id: 'review-325',
    label: 'D类',
    depth: 4,
  },
  {
    id: 'review-326',
    label: '1110，组播',
    depth: 5,
  },
  {
    id: 'review-327',
    label: 'E类',
    depth: 4,
  },
  {
    id: 'review-328',
    label: '1111，保留',
    depth: 5,
  },
  {
    id: 'review-329',
    label: '一般不使用的IP地址',
    depth: 4,
  },
  {
    id: 'review-330',
    label: '网络号全0',
    depth: 5,
  },
  {
    id: 'review-331',
    label: '主机号全1',
    depth: 5,
  },
  {
    id: 'review-332',
    label: '网络号127',
    depth: 5,
  },
  {
    id: 'review-333',
    label: '无分类编址CIDR',
    depth: 3,
  },
  {
    id: 'review-334',
    label: '网络前缀',
    depth: 4,
  },
  {
    id: 'review-335',
    label: '地址块',
    depth: 4,
  },
  {
    id: 'review-336',
    label: '三个特殊的地址块',
    depth: 5,
  },
  {
    id: 'review-337',
    label: '/32',
    depth: 6,
  },
  {
    id: 'review-338',
    label: '/31',
    depth: 6,
  },
  {
    id: 'review-339',
    label: '/0',
    depth: 6,
  },
  {
    id: 'review-340',
    label: '地址掩码（子网掩码）',
    depth: 4,
  },
  {
    id: 'review-341',
    label: '构造超网',
    depth: 4,
  },
  {
    id: 'review-342',
    label: '路由聚合',
    depth: 4,
  },
  {
    id: 'review-343',
    label: '路由汇总',
    depth: 4,
  },
  {
    id: 'review-344',
    label: '子网划分(**)',
    depth: 4,
  },
  {
    id: 'review-345',
    label: '固定长度子网划分',
    depth: 5,
  },
  {
    id: 'review-346',
    label: '子网掩码相同',
    depth: 6,
  },
  {
    id: 'review-347',
    label: '变长子网划分',
    depth: 5,
  },
  {
    id: 'review-348',
    label: '子网掩码不同',
    depth: 6,
  },
  {
    id: 'review-349',
    label: '确定需要划多少个子网',
    depth: 6,
  },
  {
    id: 'review-350',
    label: '从主机数最多的子网开始划',
    depth: 6,
  },
  {
    id: 'review-351',
    label: '满足主机数和路由器接口需求',
    depth: 7,
  },
  {
    id: 'review-352',
    label: '从主机数最多到主机数最少的子网依次分配IP',
    depth: 6,
  },
  {
    id: 'review-353',
    label: '分配IP时连续且从小到大分配',
    depth: 6,
  },
  {
    id: 'review-354',
    label: 'IP三级结构',
    depth: 5,
  },
  {
    id: 'review-355',
    label: '网络号',
    depth: 6,
  },
  {
    id: 'review-356',
    label: '子网号',
    depth: 6,
  },
  {
    id: 'review-357',
    label: '主机号',
    depth: 6,
  },
  {
    id: 'review-358',
    label: '地址解析协议ARP(*)',
    depth: 2,
  },
  {
    id: 'review-359',
    label: '原理',
    depth: 3,
  },
  {
    id: 'review-360',
    label: '请求包（广播）',
    depth: 4,
  },
  {
    id: 'review-361',
    label: '响应包（单播）',
    depth: 4,
  },
  {
    id: 'review-362',
    label: '作用',
    depth: 3,
  },
  {
    id: 'review-363',
    label: '报文格式',
    depth: 3,
  },
  {
    id: 'review-364',
    label: '封装在帧中进行传输',
    depth: 3,
  },
  {
    id: 'review-365',
    label: '同一网段和不同网段ARP',
    depth: 3,
  },
  {
    id: 'review-366',
    label: 'IP协议(*)',
    depth: 2,
  },
  {
    id: 'review-367',
    label: 'IP数据报格式(**)',
    depth: 3,
  },
  {
    id: 'review-368',
    label: '首部',
    depth: 4,
  },
  {
    id: 'review-369',
    label: '20字节固定首部',
    depth: 5,
  },
  {
    id: 'review-370',
    label: '语法语义',
    depth: 6,
  },
  {
    id: 'review-371',
    label: '可变部分',
    depth: 5,
  },
  {
    id: 'review-372',
    label: '数据',
    depth: 4,
  },
  {
    id: 'review-373',
    label: 'IP数据报分片(*)',
    depth: 3,
  },
  {
    id: 'review-374',
    label: 'MF',
    depth: 4,
  },
  {
    id: 'review-375',
    label: '片偏移字段',
    depth: 4,
  },
  {
    id: 'review-376',
    label: 'DF',
    depth: 4,
  },
  {
    id: 'review-377',
    label: '二进制反码求和',
    depth: 3,
  },
  {
    id: 'review-378',
    label: '分组转发(**)',
    depth: 2,
  },
  {
    id: 'review-379',
    label: '路由表',
    depth: 3,
  },
  {
    id: 'review-380',
    label: '路由表构造',
    depth: 4,
  },
  {
    id: 'review-381',
    label: '根据路由表进行分组转发',
    depth: 4,
  },
  {
    id: 'review-382',
    label: '主机路由',
    depth: 4,
  },
  {
    id: 'review-383',
    label: '默认路由',
    depth: 4,
  },
  {
    id: 'review-384',
    label: '最长前缀匹配',
    depth: 4,
  },
  {
    id: 'review-385',
    label: '路由器分组转发算法',
    depth: 3,
  },
  {
    id: 'review-386',
    label: '分组转发流程',
    depth: 3,
  },
  {
    id: 'review-387',
    label: '逐层解封装',
    depth: 4,
  },
  {
    id: 'review-388',
    label: '逐层封装',
    depth: 4,
  },
  {
    id: 'review-389',
    label: 'ICMP(**)',
    depth: 2,
  },
  {
    id: 'review-390',
    label: '报文格式',
    depth: 3,
  },
  {
    id: 'review-391',
    label: '首部（8字节）',
    depth: 4,
  },
  {
    id: 'review-392',
    label: '类型',
    depth: 5,
  },
  {
    id: 'review-393',
    label: '代码',
    depth: 5,
  },
  {
    id: 'review-394',
    label: '校验和',
    depth: 5,
  },
  {
    id: 'review-395',
    label: '取决于ICMP报文类型（4字节）',
    depth: 5,
  },
  {
    id: 'review-396',
    label: '数据部分',
    depth: 4,
  },
  {
    id: 'review-397',
    label: '差错报告报文(*)',
    depth: 3,
  },
  {
    id: 'review-398',
    label: '差错类型',
    depth: 4,
  },
  {
    id: 'review-399',
    label: '终点不可达(3)',
    depth: 5,
  },
  {
    id: 'review-400',
    label: '时间超过(11)',
    depth: 5,
  },
  {
    id: 'review-401',
    label: '参数问题(12)',
    depth: 5,
  },
  {
    id: 'review-402',
    label: '改变路由(5)',
    depth: 5,
  },
  {
    id: 'review-403',
    label: 'Traceroute',
    depth: 4,
  },
  {
    id: 'review-404',
    label: '询问报文',
    depth: 3,
  },
  {
    id: 'review-405',
    label: 'Ping命令',
    depth: 4,
  },
  {
    id: 'review-406',
    label: '回送请求',
    depth: 5,
  },
  {
    id: 'review-407',
    label: '回送回答',
    depth: 5,
  },
  {
    id: 'review-408',
    label: '封装在IP数据报中进行传输',
    depth: 3,
  },
  {
    id: 'review-409',
    label: 'IPv6',
    depth: 2,
  },
  {
    id: 'review-410',
    label: 'IPv6数据报',
    depth: 3,
  },
  {
    id: 'review-411',
    label: '基本首部（40字节）',
    depth: 4,
  },
  {
    id: 'review-412',
    label: '有效载荷',
    depth: 4,
  },
  {
    id: 'review-413',
    label: '扩展首部',
    depth: 5,
  },
  {
    id: 'review-414',
    label: 'IPv6地址',
    depth: 3,
  },
  {
    id: 'review-415',
    label: '单播',
    depth: 4,
  },
  {
    id: 'review-416',
    label: '节点地址',
    depth: 5,
  },
  {
    id: 'review-417',
    label: '子网前缀+接口标识符',
    depth: 5,
  },
  {
    id: 'review-418',
    label: '全球路由选择前缀+子网标识符+接口标识符',
    depth: 5,
  },
  {
    id: 'review-419',
    label: '任播',
    depth: 4,
  },
  {
    id: 'review-420',
    label: '多播',
    depth: 4,
  },
  {
    id: 'review-421',
    label: '冒号十六进制记法',
    depth: 4,
  },
  {
    id: 'review-422',
    label: 'IPv6地址简写',
    depth: 5,
  },
  {
    id: 'review-423',
    label: 'IPv4向IPv6过渡',
    depth: 3,
  },
  {
    id: 'review-424',
    label: '双协议栈',
    depth: 4,
  },
  {
    id: 'review-425',
    label: '隧道技术',
    depth: 4,
  },
  {
    id: 'review-426',
    label: 'ICMPv6',
    depth: 2,
  },
  {
    id: 'review-427',
    label: '差错报文',
    depth: 3,
  },
  {
    id: 'review-428',
    label: '信息报文',
    depth: 3,
  },
  {
    id: 'review-429',
    label: '邻居发现报文',
    depth: 3,
  },
  {
    id: 'review-430',
    label: '组成员关系报文',
    depth: 3,
  },
  {
    id: 'review-431',
    label: '互联网路由选择协议(*)',
    depth: 2,
  },
  {
    id: 'review-432',
    label: '静态路由选择策略',
    depth: 3,
  },
  {
    id: 'review-433',
    label: '人工配置',
    depth: 4,
  },
  {
    id: 'review-434',
    label: '缺省路由',
    depth: 5,
  },
  {
    id: 'review-435',
    label: '静态路由',
    depth: 5,
  },
  {
    id: 'review-436',
    label: '动态路由选择策略(*)',
    depth: 3,
  },
  {
    id: 'review-437',
    label: '域内路由选择（AS内部）',
    depth: 4,
  },
  {
    id: 'review-438',
    label: 'RIP',
    depth: 5,
  },
  {
    id: 'review-439',
    label: '分布式',
    depth: 6,
  },
  {
    id: 'review-440',
    label: '基于距离的（16跳不可达）',
    depth: 6,
  },
  {
    id: 'review-441',
    label: 'RIP特点',
    depth: 6,
  },
  {
    id: 'review-442',
    label: '仅和相邻路由器交换信息',
    depth: 7,
  },
  {
    id: 'review-443',
    label: '交换的信息是路由表',
    depth: 7,
  },
  {
    id: 'review-444',
    label: '固定时间30s/拓扑结构发生变化',
    depth: 7,
  },
  {
    id: 'review-445',
    label: '路由表更新算法',
    depth: 6,
  },
  {
    id: 'review-446',
    label: 'RIP报文格式',
    depth: 6,
  },
  {
    id: 'review-447',
    label: '首部（4字节）',
    depth: 7,
  },
  {
    id: 'review-448',
    label: '路由部分（20字节/路由，最多25条）',
    depth: 7,
  },
  {
    id: 'review-449',
    label: 'OSPF',
    depth: 5,
  },
  {
    id: 'review-450',
    label: '洪泛法',
    depth: 6,
  },
  {
    id: 'review-451',
    label: '30min洪泛',
    depth: 6,
  },
  {
    id: 'review-452',
    label: '特点',
    depth: 6,
  },
  {
    id: 'review-453',
    label: '向所有路由器发送',
    depth: 7,
  },
  {
    id: 'review-454',
    label: '发送相邻路由器的链路状态',
    depth: 7,
  },
  {
    id: 'review-455',
    label: 'OSPF中的路由器',
    depth: 6,
  },
  {
    id: 'review-456',
    label: '主干路由器',
    depth: 7,
  },
  {
    id: 'review-457',
    label: '区域边界路由器',
    depth: 7,
  },
  {
    id: 'review-458',
    label: '自治系统边界路由器',
    depth: 7,
  },
  {
    id: 'review-459',
    label: '分组类型',
    depth: 6,
  },
  {
    id: 'review-460',
    label: '问候分组',
    depth: 7,
  },
  {
    id: 'review-461',
    label: '数据库描述分组',
    depth: 7,
  },
  {
    id: 'review-462',
    label: '链路状态请求分组',
    depth: 7,
  },
  {
    id: 'review-463',
    label: '链路状态更新分组',
    depth: 7,
  },
  {
    id: 'review-464',
    label: '链路状态确认分组',
    depth: 7,
  },
  {
    id: 'review-465',
    label: 'OSPF报文格式',
    depth: 6,
  },
  {
    id: 'review-466',
    label: '采用IP数据报进行传送',
    depth: 7,
  },
  {
    id: 'review-467',
    label: '首部（24字节）',
    depth: 7,
  },
  {
    id: 'review-468',
    label: '数据部分（5种类型分组）',
    depth: 7,
  },
  {
    id: 'review-469',
    label: '域间路由选择（AS之间）',
    depth: 4,
  },
  {
    id: 'review-470',
    label: 'BGP',
    depth: 5,
  },
  {
    id: 'review-471',
    label: 'iBGP',
    depth: 6,
  },
  {
    id: 'review-472',
    label: 'eBGP',
    depth: 6,
  },
  {
    id: 'review-473',
    label: '4类报文',
    depth: 6,
  },
  {
    id: 'review-474',
    label: 'OPEN',
    depth: 7,
  },
  {
    id: 'review-475',
    label: 'UPDATE',
    depth: 7,
  },
  {
    id: 'review-476',
    label: 'KEEPALIVE',
    depth: 7,
  },
  {
    id: 'review-477',
    label: 'NOTIFICATION',
    depth: 7,
  },
  {
    id: 'review-478',
    label: '报文格式',
    depth: 6,
  },
  {
    id: 'review-479',
    label: '虚拟专用网VPN',
    depth: 2,
  },
  {
    id: 'review-480',
    label: '专用地址',
    depth: 3,
  },
  {
    id: 'review-481',
    label: '10.0.0.0/8',
    depth: 4,
  },
  {
    id: 'review-482',
    label: '172.16.0.0/12 - 172.31.255.255/12',
    depth: 4,
  },
  {
    id: 'review-483',
    label: '192.168.0.0/16',
    depth: 4,
  },
  {
    id: 'review-484',
    label: '利用公用互联网作为各专用网之间的通信载体',
    depth: 3,
  },
  {
    id: 'review-485',
    label: '隧道技术',
    depth: 3,
  },
  {
    id: 'review-486',
    label: '网络地址转换NAT(**)',
    depth: 2,
  },
  {
    id: 'review-487',
    label: '网络地址转换过程',
    depth: 3,
  },
  {
    id: 'review-488',
    label: '网络地址与端口号转换 NAPT',
    depth: 3,
  },
  {
    id: 'review-489',
    label: '类型',
    depth: 3,
  },
  {
    id: 'review-490',
    label: '静态NAT',
    depth: 4,
  },
  {
    id: 'review-491',
    label: '动态NAT',
    depth: 4,
  },
  {
    id: 'review-492',
    label: '端口NAT',
    depth: 4,
  },
  {
    id: 'review-493',
    label: '传输层',
    depth: 1,
  },
  {
    id: 'review-494',
    label: '运输层端口',
    depth: 2,
  },
  {
    id: 'review-495',
    label: '16bit',
    depth: 3,
  },
  {
    id: 'review-496',
    label: '类型',
    depth: 3,
  },
  {
    id: 'review-497',
    label: '熟知端口（0-1023）',
    depth: 4,
  },
  {
    id: 'review-498',
    label: '登记端口（1024-49151）',
    depth: 4,
  },
  {
    id: 'review-499',
    label: '短暂端口（49152-65535）',
    depth: 4,
  },
  {
    id: 'review-500',
    label: 'UDP(*)',
    depth: 2,
  },
  {
    id: 'review-501',
    label: '功能',
    depth: 3,
  },
  {
    id: 'review-502',
    label: '复用与分用',
    depth: 4,
  },
  {
    id: 'review-503',
    label: '差错校验',
    depth: 4,
  },
  {
    id: 'review-504',
    label: '伪首部（12字节）',
    depth: 5,
  },
  {
    id: 'review-505',
    label: '源IP地址',
    depth: 6,
  },
  {
    id: 'review-506',
    label: '目的IP地址',
    depth: 6,
  },
  {
    id: 'review-507',
    label: '0',
    depth: 6,
  },
  {
    id: 'review-508',
    label: '17',
    depth: 6,
  },
  {
    id: 'review-509',
    label: 'UDP长度',
    depth: 6,
  },
  {
    id: 'review-510',
    label: 'UDP用户数据报',
    depth: 5,
  },
  {
    id: 'review-511',
    label: '二进制反码求和',
    depth: 5,
  },
  {
    id: 'review-512',
    label: '特点(*)',
    depth: 3,
  },
  {
    id: 'review-513',
    label: '面向报文',
    depth: 4,
  },
  {
    id: 'review-514',
    label: '无连接',
    depth: 4,
  },
  {
    id: 'review-515',
    label: '尽最大努力交付的不可靠的服务',
    depth: 4,
  },
  {
    id: 'review-516',
    label: '没有拥塞控制',
    depth: 4,
  },
  {
    id: 'review-517',
    label: '首部格式（8字节）',
    depth: 3,
  },
  {
    id: 'review-518',
    label: '源端口号',
    depth: 4,
  },
  {
    id: 'review-519',
    label: '目的端口号',
    depth: 4,
  },
  {
    id: 'review-520',
    label: '长度',
    depth: 4,
  },
  {
    id: 'review-521',
    label: '校验和',
    depth: 4,
  },
  {
    id: 'review-522',
    label: 'TCP(*)',
    depth: 2,
  },
  {
    id: 'review-523',
    label: '特点',
    depth: 3,
  },
  {
    id: 'review-524',
    label: '面向连接',
    depth: 4,
  },
  {
    id: 'review-525',
    label: '可靠交付',
    depth: 4,
  },
  {
    id: 'review-526',
    label: '点对点',
    depth: 4,
  },
  {
    id: 'review-527',
    label: '全双工',
    depth: 4,
  },
  {
    id: 'review-528',
    label: '面向字节流',
    depth: 4,
  },
  {
    id: 'review-529',
    label: '套接字',
    depth: 3,
  },
  {
    id: 'review-530',
    label: 'IP地址',
    depth: 4,
  },
  {
    id: 'review-531',
    label: '端口号',
    depth: 4,
  },
  {
    id: 'review-532',
    label: '报文格式(*)',
    depth: 3,
  },
  {
    id: 'review-533',
    label: '首部(**)',
    depth: 4,
  },
  {
    id: 'review-534',
    label: '固定部分20字节',
    depth: 5,
  },
  {
    id: 'review-535',
    label: '计算校验和时需加入伪首部',
    depth: 6,
  },
  {
    id: 'review-536',
    label: '源IP',
    depth: 7,
  },
  {
    id: 'review-537',
    label: '目的IP',
    depth: 7,
  },
  {
    id: 'review-538',
    label: '0',
    depth: 7,
  },
  {
    id: 'review-539',
    label: '6',
    depth: 7,
  },
  {
    id: 'review-540',
    label: 'TCP总长度',
    depth: 7,
  },
  {
    id: 'review-541',
    label: '各个字段的语义',
    depth: 6,
  },
  {
    id: 'review-542',
    label: '选项',
    depth: 5,
  },
  {
    id: 'review-543',
    label: 'MSS',
    depth: 6,
  },
  {
    id: 'review-544',
    label: '窗口扩大',
    depth: 6,
  },
  {
    id: 'review-545',
    label: '最大为2^30 - 1',
    depth: 7,
  },
  {
    id: 'review-546',
    label: '时间戳',
    depth: 6,
  },
  {
    id: 'review-547',
    label: '选择确认SACK',
    depth: 6,
  },
  {
    id: 'review-548',
    label: '数据部分',
    depth: 4,
  },
  {
    id: 'review-549',
    label: '可靠传输工作原理(*)',
    depth: 2,
  },
  {
    id: 'review-550',
    label: '停止等待协议',
    depth: 3,
  },
  {
    id: 'review-551',
    label: '编号',
    depth: 4,
  },
  {
    id: 'review-552',
    label: '确认',
    depth: 4,
  },
  {
    id: 'review-553',
    label: '超时重传',
    depth: 4,
  },
  {
    id: 'review-554',
    label: '利用率',
    depth: 4,
  },
  {
    id: 'review-555',
    label: '连续ARQ协议(**)',
    depth: 3,
  },
  {
    id: 'review-556',
    label: '滑动窗口',
    depth: 4,
  },
  {
    id: 'review-557',
    label: '累积确认',
    depth: 4,
  },
  {
    id: 'review-558',
    label: 'Go-back-N',
    depth: 4,
  },
  {
    id: 'review-559',
    label: '利用率',
    depth: 4,
  },
  {
    id: 'review-560',
    label: 'TCP可靠传输',
    depth: 2,
  },
  {
    id: 'review-561',
    label: '流水线传输',
    depth: 3,
  },
  {
    id: 'review-562',
    label: '滑动窗口协议（字节为单位）',
    depth: 3,
  },
  {
    id: 'review-563',
    label: '重传时间选择',
    depth: 3,
  },
  {
    id: 'review-564',
    label: 'Karn算法',
    depth: 4,
  },
  {
    id: 'review-565',
    label: '修正的Karn算法',
    depth: 4,
  },
  {
    id: 'review-566',
    label: 'TCP流量控制(*)',
    depth: 2,
  },
  {
    id: 'review-567',
    label: '目的',
    depth: 3,
  },
  {
    id: 'review-568',
    label: '基于滑动窗口（rwnd）(*)',
    depth: 3,
  },
  {
    id: 'review-569',
    label: '持续计时器防止零窗口死锁',
    depth: 3,
  },
  {
    id: 'review-570',
    label: 'TCP发送报文的三种时机',
    depth: 3,
  },
  {
    id: 'review-571',
    label: '糊涂窗口综合征',
    depth: 3,
  },
  {
    id: 'review-572',
    label: 'TCP拥塞控制(**)',
    depth: 2,
  },
  {
    id: 'review-573',
    label: '目的',
    depth: 3,
  },
  {
    id: 'review-574',
    label: '基于滑动窗口（cwnd）(*)',
    depth: 3,
  },
  {
    id: 'review-575',
    label: '拥塞窗口cwnd',
    depth: 4,
  },
  {
    id: 'review-576',
    label: '慢开始门限ssthresh',
    depth: 4,
  },
  {
    id: 'review-577',
    label: '慢开始',
    depth: 3,
  },
  {
    id: 'review-578',
    label: '指数增大',
    depth: 4,
  },
  {
    id: 'review-579',
    label: '拥塞避免',
    depth: 3,
  },
  {
    id: 'review-580',
    label: '线性增大',
    depth: 4,
  },
  {
    id: 'review-581',
    label: '快重传',
    depth: 3,
  },
  {
    id: 'review-582',
    label: '要求接受方立即发送确认',
    depth: 4,
  },
  {
    id: 'review-583',
    label: '快恢复',
    depth: 3,
  },
  {
    id: 'review-584',
    label: 'AIMD',
    depth: 4,
  },
  {
    id: 'review-585',
    label: '超时数据包重传/三次重复ACK',
    depth: 3,
  },
  {
    id: 'review-586',
    label: 'cwnd初始值/阈值',
    depth: 3,
  },
  {
    id: 'review-587',
    label: '发送窗口=Min(cwnd, rwnd)(*)',
    depth: 3,
  },
  {
    id: 'review-588',
    label: '主动队列管理AQM(*)',
    depth: 2,
  },
  {
    id: 'review-589',
    label: '先进先出FIFO',
    depth: 3,
  },
  {
    id: 'review-590',
    label: '丢弃队尾',
    depth: 4,
  },
  {
    id: 'review-591',
    label: '随机早期检测RED(*)',
    depth: 3,
  },
  {
    id: 'review-592',
    label: '概率丢弃',
    depth: 4,
  },
  {
    id: 'review-593',
    label: 'TCP连接管理(*)',
    depth: 2,
  },
  {
    id: 'review-594',
    label: '三次握手建立连接(**)',
    depth: 3,
  },
  {
    id: 'review-595',
    label: 'SYN=1',
    depth: 4,
  },
  {
    id: 'review-596',
    label: 'SYN=1 ACK=1',
    depth: 4,
  },
  {
    id: 'review-597',
    label: 'ACK=1',
    depth: 4,
  },
  {
    id: 'review-598',
    label: '四次挥手释放连接(**)',
    depth: 3,
  },
  {
    id: 'review-599',
    label: 'FIN=1',
    depth: 4,
  },
  {
    id: 'review-600',
    label: 'ACK=1',
    depth: 4,
  },
  {
    id: 'review-601',
    label: 'FIN=1 ACK=1',
    depth: 4,
  },
  {
    id: 'review-602',
    label: 'ACK=1',
    depth: 4,
  },
  {
    id: 'review-603',
    label: '2MSL后释放连接',
    depth: 4,
  },
  {
    id: 'review-604',
    label: '保活计时器',
    depth: 3,
  },
  {
    id: 'review-605',
    label: 'TCP有限状态机',
    depth: 3,
  },
  {
    id: 'review-606',
    label: '应用层',
    depth: 1,
  },
  {
    id: 'review-607',
    label: '域名系统DNS(*)',
    depth: 2,
  },
  {
    id: 'review-608',
    label: '特点',
    depth: 3,
  },
  {
    id: 'review-609',
    label: '树状结构',
    depth: 4,
  },
  {
    id: 'review-610',
    label: '联机分布式数据库系统',
    depth: 4,
  },
  {
    id: 'review-611',
    label: 'C/S模式',
    depth: 4,
  },
  {
    id: 'review-612',
    label: 'UDP传输',
    depth: 4,
  },
  {
    id: 'review-613',
    label: 'UDP端口号53',
    depth: 5,
  },
  {
    id: 'review-614',
    label: '域名结构(*)',
    depth: 3,
  },
  {
    id: 'review-615',
    label: '顶级域名',
    depth: 4,
  },
  {
    id: 'review-616',
    label: '二级域名',
    depth: 4,
  },
  {
    id: 'review-617',
    label: '三级域名',
    depth: 4,
  },
  {
    id: 'review-618',
    label: '四级域名',
    depth: 4,
  },
  {
    id: 'review-619',
    label: '域名服务器',
    depth: 3,
  },
  {
    id: 'review-620',
    label: '管理范围是区',
    depth: 4,
  },
  {
    id: 'review-621',
    label: '根域名服务器',
    depth: 4,
  },
  {
    id: 'review-622',
    label: '13套装置',
    depth: 5,
  },
  {
    id: 'review-623',
    label: '任播',
    depth: 5,
  },
  {
    id: 'review-624',
    label: '顶级域名服务器',
    depth: 4,
  },
  {
    id: 'review-625',
    label: '权限域名服务器',
    depth: 4,
  },
  {
    id: 'review-626',
    label: '本地域名服务器',
    depth: 4,
  },
  {
    id: 'review-627',
    label: '解析过程(*)',
    depth: 3,
  },
  {
    id: 'review-628',
    label: '迭代查询',
    depth: 4,
  },
  {
    id: 'review-629',
    label: '递归查询',
    depth: 4,
  },
  {
    id: 'review-630',
    label: '高速缓存',
    depth: 3,
  },
  {
    id: 'review-631',
    label: '备份',
    depth: 3,
  },
  {
    id: 'review-632',
    label: '主域名服务器',
    depth: 4,
  },
  {
    id: 'review-633',
    label: '辅助域名服务器',
    depth: 4,
  },
  {
    id: 'review-634',
    label: '万维网WWW(*)',
    depth: 2,
  },
  {
    id: 'review-635',
    label: '目的',
    depth: 3,
  },
  {
    id: 'review-636',
    label: '工作方式',
    depth: 3,
  },
  {
    id: 'review-637',
    label: 'C/S',
    depth: 4,
  },
  {
    id: 'review-638',
    label: '统一资源定位符URL',
    depth: 3,
  },
  {
    id: 'review-639',
    label: '格式',
    depth: 4,
  },
  {
    id: 'review-640',
    label: '超文本传输协议HTTP',
    depth: 3,
  },
  {
    id: 'review-641',
    label: '面向事务的',
    depth: 4,
  },
  {
    id: 'review-642',
    label: '使用TCP连接',
    depth: 4,
  },
  {
    id: 'review-643',
    label: '无连接且无状态',
    depth: 4,
  },
  {
    id: 'review-644',
    label: '持续连接、流水线方式（HTTP/1.1）',
    depth: 4,
  },
  {
    id: 'review-645',
    label: '代理服务器（高速缓存）',
    depth: 4,
  },
  {
    id: 'review-646',
    label: '报文结构',
    depth: 4,
  },
  {
    id: 'review-647',
    label: '报文类型',
    depth: 5,
  },
  {
    id: 'review-648',
    label: '请求报文',
    depth: 6,
  },
  {
    id: 'review-649',
    label: '响应报文',
    depth: 6,
  },
  {
    id: 'review-650',
    label: '开始行',
    depth: 5,
  },
  {
    id: 'review-651',
    label: '首部行',
    depth: 5,
  },
  {
    id: 'review-652',
    label: '实体主体',
    depth: 5,
  },
  {
    id: 'review-653',
    label: 'Cookie',
    depth: 4,
  },
  {
    id: 'review-654',
    label: '记录状态信息',
    depth: 5,
  },
  {
    id: 'review-655',
    label: '万维网文档',
    depth: 3,
  },
  {
    id: 'review-656',
    label: '静态',
    depth: 4,
  },
  {
    id: 'review-657',
    label: '动态',
    depth: 4,
  },
  {
    id: 'review-658',
    label: '活动',
    depth: 4,
  },
  {
    id: 'review-659',
    label: '超文本标记语言HTML',
    depth: 3,
  },
  {
    id: 'review-660',
    label: '制作万维网文档',
    depth: 4,
  },
  {
    id: 'review-661',
    label: '与CSS配合使用',
    depth: 4,
  },
  {
    id: 'review-662',
    label: '搜索引擎',
    depth: 3,
  },
  {
    id: 'review-663',
    label: '全文检索搜索引擎',
    depth: 4,
  },
  {
    id: 'review-664',
    label: '分类目录搜索引擎',
    depth: 4,
  },
  {
    id: 'review-665',
    label: '垂直搜索引擎',
    depth: 4,
  },
  {
    id: 'review-666',
    label: '元搜索引擎',
    depth: 4,
  },
  {
    id: 'review-667',
    label: '基于TCP传输',
    depth: 3,
  },
  {
    id: 'review-668',
    label: '电子邮件',
    depth: 2,
  },
  {
    id: 'review-669',
    label: '组成',
    depth: 3,
  },
  {
    id: 'review-670',
    label: '用户代理（电子邮件客户端软件）',
    depth: 4,
  },
  {
    id: 'review-671',
    label: '邮件服务器（邮件传输代理）',
    depth: 4,
  },
  {
    id: 'review-672',
    label: 'C/S模式',
    depth: 5,
  },
  {
    id: 'review-673',
    label: '同时充当服务器/客户',
    depth: 5,
  },
  {
    id: 'review-674',
    label: '使用TCP连接',
    depth: 5,
  },
  {
    id: 'review-675',
    label: '邮件发送和读取协议',
    depth: 4,
  },
  {
    id: 'review-676',
    label: '简单邮件发送协议 SMTP',
    depth: 5,
  },
  {
    id: 'review-677',
    label: '仅能传送ASCII码',
    depth: 6,
  },
  {
    id: 'review-678',
    label: '无法传送二进制文件和可执行文件',
    depth: 6,
  },
  {
    id: 'review-679',
    label: '面向连接',
    depth: 6,
  },
  {
    id: 'review-680',
    label: '邮局协议 POP3',
    depth: 5,
  },
  {
    id: 'review-681',
    label: '即读即删',
    depth: 6,
  },
  {
    id: 'review-682',
    label: '支持用户鉴别',
    depth: 6,
  },
  {
    id: 'review-683',
    label: '网际报文存取协议IMAP',
    depth: 5,
  },
  {
    id: 'review-684',
    label: '只下载邮件首部',
    depth: 6,
  },
  {
    id: 'review-685',
    label: '可对邮件进行管理',
    depth: 6,
  },
  {
    id: 'review-686',
    label: '必须联网',
    depth: 6,
  },
  {
    id: 'review-687',
    label: '电子邮件格式',
    depth: 3,
  },
  {
    id: 'review-688',
    label: '信封',
    depth: 4,
  },
  {
    id: 'review-689',
    label: '内容',
    depth: 4,
  },
  {
    id: 'review-690',
    label: '首部',
    depth: 5,
  },
  {
    id: 'review-691',
    label: '主体',
    depth: 5,
  },
  {
    id: 'review-692',
    label: '基于万维网的电子邮件',
    depth: 3,
  },
  {
    id: 'review-693',
    label: 'HTTP',
    depth: 4,
  },
  {
    id: 'review-694',
    label: 'SMTP',
    depth: 4,
  },
  {
    id: 'review-695',
    label: '通用互联网邮件扩充MIME',
    depth: 3,
  },
  {
    id: 'review-696',
    label: '增加了邮件主体的结构',
    depth: 4,
  },
  {
    id: 'review-697',
    label: '新增5个邮件首部',
    depth: 5,
  },
  {
    id: 'review-698',
    label: '定义了非ASCII码编码规则',
    depth: 4,
  },
  {
    id: 'review-699',
    label: 'Quoted-printable',
    depth: 5,
  },
  {
    id: 'review-700',
    label: 'BASE64',
    depth: 5,
  },
  {
    id: 'review-701',
    label: '内容类型/子类型',
    depth: 4,
  },
  {
    id: 'review-702',
    label: '基于TCP传输',
    depth: 3,
  },
  {
    id: 'review-703',
    label: '动态主机配置协议DHCP(*)',
    depth: 2,
  },
  {
    id: 'review-704',
    label: '作用',
    depth: 3,
  },
  {
    id: 'review-705',
    label: 'C/S方式',
    depth: 3,
  },
  {
    id: 'review-706',
    label: '报文类型',
    depth: 3,
  },
  {
    id: 'review-707',
    label: 'Discover',
    depth: 4,
  },
  {
    id: 'review-708',
    label: 'Offer',
    depth: 4,
  },
  {
    id: 'review-709',
    label: 'Request',
    depth: 4,
  },
  {
    id: 'review-710',
    label: 'ACK',
    depth: 4,
  },
  {
    id: 'review-711',
    label: '中继代理',
    depth: 3,
  },
  {
    id: 'review-712',
    label: '主机广播',
    depth: 4,
  },
  {
    id: 'review-713',
    label: '中继代理单播',
    depth: 4,
  },
  {
    id: 'review-714',
    label: '租用期',
    depth: 3,
  },
  {
    id: 'review-715',
    label: '0.5个租用期',
    depth: 4,
  },
  {
    id: 'review-716',
    label: '0.875个租用期',
    depth: 4,
  },
  {
    id: 'review-717',
    label: '基于UDP传输',
    depth: 3,
  },
  {
    id: 'review-718',
    label: '服务器67端口',
    depth: 4,
  },
  {
    id: 'review-719',
    label: '客户端68端口',
    depth: 4,
  },
  {
    id: 'review-720',
    label: '获取IP/DNS服务器/网关地址',
    depth: 3,
  },
  {
    id: 'review-721',
    label: '文件传输协议FTP',
    depth: 2,
  },
  {
    id: 'review-722',
    label: '主进程',
    depth: 3,
  },
  {
    id: 'review-723',
    label: '从属进程',
    depth: 3,
  },
  {
    id: 'review-724',
    label: '控制进程',
    depth: 4,
  },
  {
    id: 'review-725',
    label: '控制连接',
    depth: 5,
  },
  {
    id: 'review-726',
    label: '服务器21端口',
    depth: 6,
  },
  {
    id: 'review-727',
    label: '会话期间一直保持',
    depth: 6,
  },
  {
    id: 'review-728',
    label: '客户端临时端口',
    depth: 6,
  },
  {
    id: 'review-729',
    label: '数据传输进程',
    depth: 4,
  },
  {
    id: 'review-730',
    label: '数据连接',
    depth: 5,
  },
  {
    id: 'review-731',
    label: '服务器20端口',
    depth: 6,
  },
  {
    id: 'review-732',
    label: '传送完数据后关闭',
    depth: 6,
  },
  {
    id: 'review-733',
    label: '客户端临时端口',
    depth: 6,
  },
] satisfies RawHierarchyNode[]

export const textbookReviewGraphEdges = [
  {
    source: 'review-0',
    target: 'review-1',
    relation: 'CONTAINS',
  },
  {
    source: 'review-1',
    target: 'review-2',
    relation: 'CONTAINS',
  },
  {
    source: 'review-2',
    target: 'review-3',
    relation: 'CONTAINS',
  },
  {
    source: 'review-2',
    target: 'review-4',
    relation: 'CONTAINS',
  },
  {
    source: 'review-2',
    target: 'review-5',
    relation: 'CONTAINS',
  },
  {
    source: 'review-1',
    target: 'review-6',
    relation: 'CONTAINS',
  },
  {
    source: 'review-1',
    target: 'review-7',
    relation: 'CONTAINS',
  },
  {
    source: 'review-7',
    target: 'review-8',
    relation: 'CONTAINS',
  },
  {
    source: 'review-7',
    target: 'review-9',
    relation: 'CONTAINS',
  },
  {
    source: 'review-1',
    target: 'review-10',
    relation: 'CONTAINS',
  },
  {
    source: 'review-1',
    target: 'review-11',
    relation: 'CONTAINS',
  },
  {
    source: 'review-11',
    target: 'review-12',
    relation: 'CONTAINS',
  },
  {
    source: 'review-11',
    target: 'review-13',
    relation: 'CONTAINS',
  },
  {
    source: 'review-1',
    target: 'review-14',
    relation: 'CONTAINS',
  },
  {
    source: 'review-14',
    target: 'review-15',
    relation: 'CONTAINS',
  },
  {
    source: 'review-14',
    target: 'review-16',
    relation: 'CONTAINS',
  },
  {
    source: 'review-14',
    target: 'review-17',
    relation: 'CONTAINS',
  },
  {
    source: 'review-1',
    target: 'review-18',
    relation: 'CONTAINS',
  },
  {
    source: 'review-18',
    target: 'review-19',
    relation: 'CONTAINS',
  },
  {
    source: 'review-18',
    target: 'review-20',
    relation: 'CONTAINS',
  },
  {
    source: 'review-1',
    target: 'review-21',
    relation: 'CONTAINS',
  },
  {
    source: 'review-21',
    target: 'review-22',
    relation: 'CONTAINS',
  },
  {
    source: 'review-21',
    target: 'review-23',
    relation: 'CONTAINS',
  },
  {
    source: 'review-1',
    target: 'review-24',
    relation: 'CONTAINS',
  },
  {
    source: 'review-24',
    target: 'review-25',
    relation: 'CONTAINS',
  },
  {
    source: 'review-24',
    target: 'review-26',
    relation: 'CONTAINS',
  },
  {
    source: 'review-24',
    target: 'review-27',
    relation: 'CONTAINS',
  },
  {
    source: 'review-1',
    target: 'review-28',
    relation: 'CONTAINS',
  },
  {
    source: 'review-28',
    target: 'review-29',
    relation: 'CONTAINS',
  },
  {
    source: 'review-29',
    target: 'review-30',
    relation: 'CONTAINS',
  },
  {
    source: 'review-29',
    target: 'review-31',
    relation: 'CONTAINS',
  },
  {
    source: 'review-29',
    target: 'review-32',
    relation: 'CONTAINS',
  },
  {
    source: 'review-29',
    target: 'review-33',
    relation: 'CONTAINS',
  },
  {
    source: 'review-28',
    target: 'review-34',
    relation: 'CONTAINS',
  },
  {
    source: 'review-34',
    target: 'review-35',
    relation: 'CONTAINS',
  },
  {
    source: 'review-34',
    target: 'review-36',
    relation: 'CONTAINS',
  },
  {
    source: 'review-1',
    target: 'review-37',
    relation: 'CONTAINS',
  },
  {
    source: 'review-37',
    target: 'review-38',
    relation: 'CONTAINS',
  },
  {
    source: 'review-38',
    target: 'review-39',
    relation: 'CONTAINS',
  },
  {
    source: 'review-38',
    target: 'review-40',
    relation: 'CONTAINS',
  },
  {
    source: 'review-38',
    target: 'review-41',
    relation: 'CONTAINS',
  },
  {
    source: 'review-37',
    target: 'review-42',
    relation: 'CONTAINS',
  },
  {
    source: 'review-42',
    target: 'review-43',
    relation: 'CONTAINS',
  },
  {
    source: 'review-42',
    target: 'review-44',
    relation: 'CONTAINS',
  },
  {
    source: 'review-42',
    target: 'review-45',
    relation: 'CONTAINS',
  },
  {
    source: 'review-37',
    target: 'review-46',
    relation: 'CONTAINS',
  },
  {
    source: 'review-46',
    target: 'review-47',
    relation: 'CONTAINS',
  },
  {
    source: 'review-46',
    target: 'review-48',
    relation: 'CONTAINS',
  },
  {
    source: 'review-46',
    target: 'review-49',
    relation: 'CONTAINS',
  },
  {
    source: 'review-37',
    target: 'review-50',
    relation: 'CONTAINS',
  },
  {
    source: 'review-50',
    target: 'review-51',
    relation: 'CONTAINS',
  },
  {
    source: 'review-50',
    target: 'review-52',
    relation: 'CONTAINS',
  },
  {
    source: 'review-50',
    target: 'review-53',
    relation: 'CONTAINS',
  },
  {
    source: 'review-53',
    target: 'review-54',
    relation: 'CONTAINS',
  },
  {
    source: 'review-50',
    target: 'review-55',
    relation: 'CONTAINS',
  },
  {
    source: 'review-50',
    target: 'review-56',
    relation: 'CONTAINS',
  },
  {
    source: 'review-50',
    target: 'review-57',
    relation: 'CONTAINS',
  },
  {
    source: 'review-37',
    target: 'review-58',
    relation: 'CONTAINS',
  },
  {
    source: 'review-58',
    target: 'review-59',
    relation: 'CONTAINS',
  },
  {
    source: 'review-58',
    target: 'review-60',
    relation: 'CONTAINS',
  },
  {
    source: 'review-58',
    target: 'review-61',
    relation: 'CONTAINS',
  },
  {
    source: 'review-37',
    target: 'review-62',
    relation: 'CONTAINS',
  },
  {
    source: 'review-62',
    target: 'review-63',
    relation: 'CONTAINS',
  },
  {
    source: 'review-62',
    target: 'review-64',
    relation: 'CONTAINS',
  },
  {
    source: 'review-37',
    target: 'review-65',
    relation: 'CONTAINS',
  },
  {
    source: 'review-65',
    target: 'review-66',
    relation: 'CONTAINS',
  },
  {
    source: 'review-65',
    target: 'review-67',
    relation: 'CONTAINS',
  },
  {
    source: 'review-1',
    target: 'review-68',
    relation: 'CONTAINS',
  },
  {
    source: 'review-68',
    target: 'review-69',
    relation: 'CONTAINS',
  },
  {
    source: 'review-69',
    target: 'review-70',
    relation: 'CONTAINS',
  },
  {
    source: 'review-69',
    target: 'review-71',
    relation: 'CONTAINS',
  },
  {
    source: 'review-69',
    target: 'review-72',
    relation: 'CONTAINS',
  },
  {
    source: 'review-69',
    target: 'review-73',
    relation: 'CONTAINS',
  },
  {
    source: 'review-69',
    target: 'review-74',
    relation: 'CONTAINS',
  },
  {
    source: 'review-69',
    target: 'review-75',
    relation: 'CONTAINS',
  },
  {
    source: 'review-69',
    target: 'review-76',
    relation: 'CONTAINS',
  },
  {
    source: 'review-68',
    target: 'review-77',
    relation: 'CONTAINS',
  },
  {
    source: 'review-77',
    target: 'review-78',
    relation: 'CONTAINS',
  },
  {
    source: 'review-77',
    target: 'review-79',
    relation: 'CONTAINS',
  },
  {
    source: 'review-77',
    target: 'review-80',
    relation: 'CONTAINS',
  },
  {
    source: 'review-77',
    target: 'review-81',
    relation: 'CONTAINS',
  },
  {
    source: 'review-68',
    target: 'review-82',
    relation: 'CONTAINS',
  },
  {
    source: 'review-82',
    target: 'review-83',
    relation: 'CONTAINS',
  },
  {
    source: 'review-83',
    target: 'review-84',
    relation: 'CONTAINS',
  },
  {
    source: 'review-82',
    target: 'review-85',
    relation: 'CONTAINS',
  },
  {
    source: 'review-85',
    target: 'review-86',
    relation: 'CONTAINS',
  },
  {
    source: 'review-82',
    target: 'review-87',
    relation: 'CONTAINS',
  },
  {
    source: 'review-87',
    target: 'review-88',
    relation: 'CONTAINS',
  },
  {
    source: 'review-82',
    target: 'review-89',
    relation: 'CONTAINS',
  },
  {
    source: 'review-89',
    target: 'review-90',
    relation: 'CONTAINS',
  },
  {
    source: 'review-82',
    target: 'review-91',
    relation: 'CONTAINS',
  },
  {
    source: 'review-91',
    target: 'review-92',
    relation: 'CONTAINS',
  },
  {
    source: 'review-1',
    target: 'review-93',
    relation: 'CONTAINS',
  },
  {
    source: 'review-93',
    target: 'review-94',
    relation: 'CONTAINS',
  },
  {
    source: 'review-93',
    target: 'review-95',
    relation: 'CONTAINS',
  },
  {
    source: 'review-93',
    target: 'review-96',
    relation: 'CONTAINS',
  },
  {
    source: 'review-1',
    target: 'review-97',
    relation: 'CONTAINS',
  },
  {
    source: 'review-1',
    target: 'review-98',
    relation: 'CONTAINS',
  },
  {
    source: 'review-98',
    target: 'review-99',
    relation: 'CONTAINS',
  },
  {
    source: 'review-98',
    target: 'review-100',
    relation: 'CONTAINS',
  },
  {
    source: 'review-98',
    target: 'review-101',
    relation: 'CONTAINS',
  },
  {
    source: 'review-0',
    target: 'review-102',
    relation: 'CONTAINS',
  },
  {
    source: 'review-102',
    target: 'review-103',
    relation: 'CONTAINS',
  },
  {
    source: 'review-103',
    target: 'review-104',
    relation: 'CONTAINS',
  },
  {
    source: 'review-104',
    target: 'review-105',
    relation: 'CONTAINS',
  },
  {
    source: 'review-104',
    target: 'review-106',
    relation: 'CONTAINS',
  },
  {
    source: 'review-103',
    target: 'review-107',
    relation: 'CONTAINS',
  },
  {
    source: 'review-107',
    target: 'review-108',
    relation: 'CONTAINS',
  },
  {
    source: 'review-102',
    target: 'review-109',
    relation: 'CONTAINS',
  },
  {
    source: 'review-109',
    target: 'review-110',
    relation: 'CONTAINS',
  },
  {
    source: 'review-109',
    target: 'review-111',
    relation: 'CONTAINS',
  },
  {
    source: 'review-109',
    target: 'review-112',
    relation: 'CONTAINS',
  },
  {
    source: 'review-109',
    target: 'review-113',
    relation: 'CONTAINS',
  },
  {
    source: 'review-102',
    target: 'review-114',
    relation: 'CONTAINS',
  },
  {
    source: 'review-114',
    target: 'review-115',
    relation: 'CONTAINS',
  },
  {
    source: 'review-114',
    target: 'review-116',
    relation: 'CONTAINS',
  },
  {
    source: 'review-114',
    target: 'review-117',
    relation: 'CONTAINS',
  },
  {
    source: 'review-102',
    target: 'review-118',
    relation: 'CONTAINS',
  },
  {
    source: 'review-118',
    target: 'review-119',
    relation: 'CONTAINS',
  },
  {
    source: 'review-119',
    target: 'review-120',
    relation: 'CONTAINS',
  },
  {
    source: 'review-119',
    target: 'review-121',
    relation: 'CONTAINS',
  },
  {
    source: 'review-119',
    target: 'review-122',
    relation: 'CONTAINS',
  },
  {
    source: 'review-119',
    target: 'review-123',
    relation: 'CONTAINS',
  },
  {
    source: 'review-118',
    target: 'review-124',
    relation: 'CONTAINS',
  },
  {
    source: 'review-124',
    target: 'review-125',
    relation: 'CONTAINS',
  },
  {
    source: 'review-124',
    target: 'review-126',
    relation: 'CONTAINS',
  },
  {
    source: 'review-124',
    target: 'review-127',
    relation: 'CONTAINS',
  },
  {
    source: 'review-102',
    target: 'review-128',
    relation: 'CONTAINS',
  },
  {
    source: 'review-102',
    target: 'review-129',
    relation: 'CONTAINS',
  },
  {
    source: 'review-129',
    target: 'review-130',
    relation: 'CONTAINS',
  },
  {
    source: 'review-102',
    target: 'review-131',
    relation: 'CONTAINS',
  },
  {
    source: 'review-131',
    target: 'review-132',
    relation: 'CONTAINS',
  },
  {
    source: 'review-102',
    target: 'review-133',
    relation: 'CONTAINS',
  },
  {
    source: 'review-133',
    target: 'review-134',
    relation: 'CONTAINS',
  },
  {
    source: 'review-102',
    target: 'review-135',
    relation: 'CONTAINS',
  },
  {
    source: 'review-135',
    target: 'review-136',
    relation: 'CONTAINS',
  },
  {
    source: 'review-136',
    target: 'review-137',
    relation: 'CONTAINS',
  },
  {
    source: 'review-137',
    target: 'review-138',
    relation: 'CONTAINS',
  },
  {
    source: 'review-137',
    target: 'review-139',
    relation: 'CONTAINS',
  },
  {
    source: 'review-137',
    target: 'review-140',
    relation: 'CONTAINS',
  },
  {
    source: 'review-136',
    target: 'review-141',
    relation: 'CONTAINS',
  },
  {
    source: 'review-141',
    target: 'review-142',
    relation: 'CONTAINS',
  },
  {
    source: 'review-141',
    target: 'review-143',
    relation: 'CONTAINS',
  },
  {
    source: 'review-136',
    target: 'review-144',
    relation: 'CONTAINS',
  },
  {
    source: 'review-144',
    target: 'review-145',
    relation: 'CONTAINS',
  },
  {
    source: 'review-144',
    target: 'review-146',
    relation: 'CONTAINS',
  },
  {
    source: 'review-135',
    target: 'review-147',
    relation: 'CONTAINS',
  },
  {
    source: 'review-147',
    target: 'review-148',
    relation: 'CONTAINS',
  },
  {
    source: 'review-148',
    target: 'review-149',
    relation: 'CONTAINS',
  },
  {
    source: 'review-147',
    target: 'review-150',
    relation: 'CONTAINS',
  },
  {
    source: 'review-150',
    target: 'review-151',
    relation: 'CONTAINS',
  },
  {
    source: 'review-151',
    target: 'review-152',
    relation: 'CONTAINS',
  },
  {
    source: 'review-151',
    target: 'review-153',
    relation: 'CONTAINS',
  },
  {
    source: 'review-150',
    target: 'review-154',
    relation: 'CONTAINS',
  },
  {
    source: 'review-102',
    target: 'review-155',
    relation: 'CONTAINS',
  },
  {
    source: 'review-155',
    target: 'review-156',
    relation: 'CONTAINS',
  },
  {
    source: 'review-155',
    target: 'review-157',
    relation: 'CONTAINS',
  },
  {
    source: 'review-157',
    target: 'review-158',
    relation: 'CONTAINS',
  },
  {
    source: 'review-155',
    target: 'review-159',
    relation: 'CONTAINS',
  },
  {
    source: 'review-159',
    target: 'review-160',
    relation: 'CONTAINS',
  },
  {
    source: 'review-155',
    target: 'review-161',
    relation: 'CONTAINS',
  },
  {
    source: 'review-161',
    target: 'review-162',
    relation: 'CONTAINS',
  },
  {
    source: 'review-162',
    target: 'review-163',
    relation: 'CONTAINS',
  },
  {
    source: 'review-102',
    target: 'review-164',
    relation: 'CONTAINS',
  },
  {
    source: 'review-164',
    target: 'review-165',
    relation: 'CONTAINS',
  },
  {
    source: 'review-164',
    target: 'review-166',
    relation: 'CONTAINS',
  },
  {
    source: 'review-164',
    target: 'review-167',
    relation: 'CONTAINS',
  },
  {
    source: 'review-164',
    target: 'review-168',
    relation: 'CONTAINS',
  },
  {
    source: 'review-164',
    target: 'review-169',
    relation: 'CONTAINS',
  },
  {
    source: 'review-164',
    target: 'review-170',
    relation: 'CONTAINS',
  },
  {
    source: 'review-170',
    target: 'review-171',
    relation: 'CONTAINS',
  },
  {
    source: 'review-164',
    target: 'review-172',
    relation: 'CONTAINS',
  },
  {
    source: 'review-172',
    target: 'review-173',
    relation: 'CONTAINS',
  },
  {
    source: 'review-164',
    target: 'review-174',
    relation: 'CONTAINS',
  },
  {
    source: 'review-174',
    target: 'review-175',
    relation: 'CONTAINS',
  },
  {
    source: 'review-174',
    target: 'review-176',
    relation: 'CONTAINS',
  },
  {
    source: 'review-174',
    target: 'review-177',
    relation: 'CONTAINS',
  },
  {
    source: 'review-164',
    target: 'review-178',
    relation: 'CONTAINS',
  },
  {
    source: 'review-178',
    target: 'review-179',
    relation: 'CONTAINS',
  },
  {
    source: 'review-178',
    target: 'review-180',
    relation: 'CONTAINS',
  },
  {
    source: 'review-102',
    target: 'review-181',
    relation: 'CONTAINS',
  },
  {
    source: 'review-181',
    target: 'review-182',
    relation: 'CONTAINS',
  },
  {
    source: 'review-182',
    target: 'review-183',
    relation: 'CONTAINS',
  },
  {
    source: 'review-182',
    target: 'review-184',
    relation: 'CONTAINS',
  },
  {
    source: 'review-182',
    target: 'review-185',
    relation: 'CONTAINS',
  },
  {
    source: 'review-181',
    target: 'review-186',
    relation: 'CONTAINS',
  },
  {
    source: 'review-0',
    target: 'review-187',
    relation: 'CONTAINS',
  },
  {
    source: 'review-187',
    target: 'review-188',
    relation: 'CONTAINS',
  },
  {
    source: 'review-188',
    target: 'review-189',
    relation: 'CONTAINS',
  },
  {
    source: 'review-188',
    target: 'review-190',
    relation: 'CONTAINS',
  },
  {
    source: 'review-187',
    target: 'review-191',
    relation: 'CONTAINS',
  },
  {
    source: 'review-191',
    target: 'review-192',
    relation: 'CONTAINS',
  },
  {
    source: 'review-192',
    target: 'review-193',
    relation: 'CONTAINS',
  },
  {
    source: 'review-191',
    target: 'review-194',
    relation: 'CONTAINS',
  },
  {
    source: 'review-194',
    target: 'review-195',
    relation: 'CONTAINS',
  },
  {
    source: 'review-194',
    target: 'review-196',
    relation: 'CONTAINS',
  },
  {
    source: 'review-194',
    target: 'review-197',
    relation: 'CONTAINS',
  },
  {
    source: 'review-191',
    target: 'review-198',
    relation: 'CONTAINS',
  },
  {
    source: 'review-198',
    target: 'review-199',
    relation: 'CONTAINS',
  },
  {
    source: 'review-187',
    target: 'review-200',
    relation: 'CONTAINS',
  },
  {
    source: 'review-200',
    target: 'review-201',
    relation: 'CONTAINS',
  },
  {
    source: 'review-201',
    target: 'review-202',
    relation: 'CONTAINS',
  },
  {
    source: 'review-201',
    target: 'review-203',
    relation: 'CONTAINS',
  },
  {
    source: 'review-201',
    target: 'review-204',
    relation: 'CONTAINS',
  },
  {
    source: 'review-204',
    target: 'review-205',
    relation: 'CONTAINS',
  },
  {
    source: 'review-204',
    target: 'review-206',
    relation: 'CONTAINS',
  },
  {
    source: 'review-204',
    target: 'review-207',
    relation: 'CONTAINS',
  },
  {
    source: 'review-204',
    target: 'review-208',
    relation: 'CONTAINS',
  },
  {
    source: 'review-208',
    target: 'review-209',
    relation: 'CONTAINS',
  },
  {
    source: 'review-208',
    target: 'review-210',
    relation: 'CONTAINS',
  },
  {
    source: 'review-204',
    target: 'review-211',
    relation: 'CONTAINS',
  },
  {
    source: 'review-211',
    target: 'review-212',
    relation: 'CONTAINS',
  },
  {
    source: 'review-211',
    target: 'review-213',
    relation: 'CONTAINS',
  },
  {
    source: 'review-200',
    target: 'review-214',
    relation: 'CONTAINS',
  },
  {
    source: 'review-214',
    target: 'review-215',
    relation: 'CONTAINS',
  },
  {
    source: 'review-214',
    target: 'review-216',
    relation: 'CONTAINS',
  },
  {
    source: 'review-214',
    target: 'review-217',
    relation: 'CONTAINS',
  },
  {
    source: 'review-187',
    target: 'review-218',
    relation: 'CONTAINS',
  },
  {
    source: 'review-218',
    target: 'review-219',
    relation: 'CONTAINS',
  },
  {
    source: 'review-219',
    target: 'review-220',
    relation: 'CONTAINS',
  },
  {
    source: 'review-219',
    target: 'review-221',
    relation: 'CONTAINS',
  },
  {
    source: 'review-218',
    target: 'review-222',
    relation: 'CONTAINS',
  },
  {
    source: 'review-222',
    target: 'review-223',
    relation: 'CONTAINS',
  },
  {
    source: 'review-222',
    target: 'review-224',
    relation: 'CONTAINS',
  },
  {
    source: 'review-218',
    target: 'review-225',
    relation: 'CONTAINS',
  },
  {
    source: 'review-225',
    target: 'review-226',
    relation: 'CONTAINS',
  },
  {
    source: 'review-225',
    target: 'review-227',
    relation: 'CONTAINS',
  },
  {
    source: 'review-225',
    target: 'review-228',
    relation: 'CONTAINS',
  },
  {
    source: 'review-228',
    target: 'review-229',
    relation: 'CONTAINS',
  },
  {
    source: 'review-228',
    target: 'review-230',
    relation: 'CONTAINS',
  },
  {
    source: 'review-230',
    target: 'review-231',
    relation: 'CONTAINS',
  },
  {
    source: 'review-230',
    target: 'review-232',
    relation: 'CONTAINS',
  },
  {
    source: 'review-228',
    target: 'review-233',
    relation: 'CONTAINS',
  },
  {
    source: 'review-225',
    target: 'review-234',
    relation: 'CONTAINS',
  },
  {
    source: 'review-187',
    target: 'review-235',
    relation: 'CONTAINS',
  },
  {
    source: 'review-235',
    target: 'review-236',
    relation: 'CONTAINS',
  },
  {
    source: 'review-235',
    target: 'review-237',
    relation: 'CONTAINS',
  },
  {
    source: 'review-235',
    target: 'review-238',
    relation: 'CONTAINS',
  },
  {
    source: 'review-187',
    target: 'review-239',
    relation: 'CONTAINS',
  },
  {
    source: 'review-239',
    target: 'review-240',
    relation: 'CONTAINS',
  },
  {
    source: 'review-239',
    target: 'review-241',
    relation: 'CONTAINS',
  },
  {
    source: 'review-187',
    target: 'review-242',
    relation: 'CONTAINS',
  },
  {
    source: 'review-242',
    target: 'review-243',
    relation: 'CONTAINS',
  },
  {
    source: 'review-242',
    target: 'review-244',
    relation: 'CONTAINS',
  },
  {
    source: 'review-242',
    target: 'review-245',
    relation: 'CONTAINS',
  },
  {
    source: 'review-242',
    target: 'review-246',
    relation: 'CONTAINS',
  },
  {
    source: 'review-242',
    target: 'review-247',
    relation: 'CONTAINS',
  },
  {
    source: 'review-187',
    target: 'review-248',
    relation: 'CONTAINS',
  },
  {
    source: 'review-248',
    target: 'review-249',
    relation: 'CONTAINS',
  },
  {
    source: 'review-249',
    target: 'review-250',
    relation: 'CONTAINS',
  },
  {
    source: 'review-248',
    target: 'review-251',
    relation: 'CONTAINS',
  },
  {
    source: 'review-251',
    target: 'review-252',
    relation: 'CONTAINS',
  },
  {
    source: 'review-187',
    target: 'review-253',
    relation: 'CONTAINS',
  },
  {
    source: 'review-253',
    target: 'review-254',
    relation: 'CONTAINS',
  },
  {
    source: 'review-254',
    target: 'review-255',
    relation: 'CONTAINS',
  },
  {
    source: 'review-254',
    target: 'review-256',
    relation: 'CONTAINS',
  },
  {
    source: 'review-253',
    target: 'review-257',
    relation: 'CONTAINS',
  },
  {
    source: 'review-257',
    target: 'review-258',
    relation: 'CONTAINS',
  },
  {
    source: 'review-257',
    target: 'review-259',
    relation: 'CONTAINS',
  },
  {
    source: 'review-259',
    target: 'review-260',
    relation: 'CONTAINS',
  },
  {
    source: 'review-260',
    target: 'review-261',
    relation: 'CONTAINS',
  },
  {
    source: 'review-261',
    target: 'review-262',
    relation: 'CONTAINS',
  },
  {
    source: 'review-261',
    target: 'review-263',
    relation: 'CONTAINS',
  },
  {
    source: 'review-261',
    target: 'review-264',
    relation: 'CONTAINS',
  },
  {
    source: 'review-260',
    target: 'review-265',
    relation: 'CONTAINS',
  },
  {
    source: 'review-265',
    target: 'review-266',
    relation: 'CONTAINS',
  },
  {
    source: 'review-266',
    target: 'review-267',
    relation: 'CONTAINS',
  },
  {
    source: 'review-260',
    target: 'review-268',
    relation: 'CONTAINS',
  },
  {
    source: 'review-268',
    target: 'review-269',
    relation: 'CONTAINS',
  },
  {
    source: 'review-260',
    target: 'review-270',
    relation: 'CONTAINS',
  },
  {
    source: 'review-270',
    target: 'review-271',
    relation: 'CONTAINS',
  },
  {
    source: 'review-253',
    target: 'review-272',
    relation: 'CONTAINS',
  },
  {
    source: 'review-272',
    target: 'review-273',
    relation: 'CONTAINS',
  },
  {
    source: 'review-272',
    target: 'review-274',
    relation: 'CONTAINS',
  },
  {
    source: 'review-253',
    target: 'review-275',
    relation: 'CONTAINS',
  },
  {
    source: 'review-275',
    target: 'review-276',
    relation: 'CONTAINS',
  },
  {
    source: 'review-275',
    target: 'review-277',
    relation: 'CONTAINS',
  },
  {
    source: 'review-253',
    target: 'review-278',
    relation: 'CONTAINS',
  },
  {
    source: 'review-278',
    target: 'review-279',
    relation: 'CONTAINS',
  },
  {
    source: 'review-279',
    target: 'review-280',
    relation: 'CONTAINS',
  },
  {
    source: 'review-278',
    target: 'review-281',
    relation: 'CONTAINS',
  },
  {
    source: 'review-278',
    target: 'review-282',
    relation: 'CONTAINS',
  },
  {
    source: 'review-282',
    target: 'review-283',
    relation: 'CONTAINS',
  },
  {
    source: 'review-282',
    target: 'review-284',
    relation: 'CONTAINS',
  },
  {
    source: 'review-278',
    target: 'review-285',
    relation: 'CONTAINS',
  },
  {
    source: 'review-187',
    target: 'review-286',
    relation: 'CONTAINS',
  },
  {
    source: 'review-286',
    target: 'review-287',
    relation: 'CONTAINS',
  },
  {
    source: 'review-286',
    target: 'review-288',
    relation: 'CONTAINS',
  },
  {
    source: 'review-288',
    target: 'review-289',
    relation: 'CONTAINS',
  },
  {
    source: 'review-288',
    target: 'review-290',
    relation: 'CONTAINS',
  },
  {
    source: 'review-286',
    target: 'review-291',
    relation: 'CONTAINS',
  },
  {
    source: 'review-286',
    target: 'review-292',
    relation: 'CONTAINS',
  },
  {
    source: 'review-292',
    target: 'review-293',
    relation: 'CONTAINS',
  },
  {
    source: 'review-0',
    target: 'review-294',
    relation: 'CONTAINS',
  },
  {
    source: 'review-294',
    target: 'review-295',
    relation: 'CONTAINS',
  },
  {
    source: 'review-295',
    target: 'review-296',
    relation: 'CONTAINS',
  },
  {
    source: 'review-295',
    target: 'review-297',
    relation: 'CONTAINS',
  },
  {
    source: 'review-294',
    target: 'review-298',
    relation: 'CONTAINS',
  },
  {
    source: 'review-298',
    target: 'review-299',
    relation: 'CONTAINS',
  },
  {
    source: 'review-299',
    target: 'review-300',
    relation: 'CONTAINS',
  },
  {
    source: 'review-298',
    target: 'review-301',
    relation: 'CONTAINS',
  },
  {
    source: 'review-301',
    target: 'review-302',
    relation: 'CONTAINS',
  },
  {
    source: 'review-294',
    target: 'review-303',
    relation: 'CONTAINS',
  },
  {
    source: 'review-303',
    target: 'review-304',
    relation: 'CONTAINS',
  },
  {
    source: 'review-304',
    target: 'review-305',
    relation: 'CONTAINS',
  },
  {
    source: 'review-304',
    target: 'review-306',
    relation: 'CONTAINS',
  },
  {
    source: 'review-304',
    target: 'review-307',
    relation: 'CONTAINS',
  },
  {
    source: 'review-307',
    target: 'review-308',
    relation: 'CONTAINS',
  },
  {
    source: 'review-307',
    target: 'review-309',
    relation: 'CONTAINS',
  },
  {
    source: 'review-309',
    target: 'review-310',
    relation: 'CONTAINS',
  },
  {
    source: 'review-309',
    target: 'review-311',
    relation: 'CONTAINS',
  },
  {
    source: 'review-304',
    target: 'review-312',
    relation: 'CONTAINS',
  },
  {
    source: 'review-304',
    target: 'review-313',
    relation: 'CONTAINS',
  },
  {
    source: 'review-304',
    target: 'review-314',
    relation: 'CONTAINS',
  },
  {
    source: 'review-303',
    target: 'review-315',
    relation: 'CONTAINS',
  },
  {
    source: 'review-315',
    target: 'review-316',
    relation: 'CONTAINS',
  },
  {
    source: 'review-316',
    target: 'review-317',
    relation: 'CONTAINS',
  },
  {
    source: 'review-317',
    target: 'review-318',
    relation: 'CONTAINS',
  },
  {
    source: 'review-315',
    target: 'review-319',
    relation: 'CONTAINS',
  },
  {
    source: 'review-319',
    target: 'review-320',
    relation: 'CONTAINS',
  },
  {
    source: 'review-320',
    target: 'review-321',
    relation: 'CONTAINS',
  },
  {
    source: 'review-315',
    target: 'review-322',
    relation: 'CONTAINS',
  },
  {
    source: 'review-322',
    target: 'review-323',
    relation: 'CONTAINS',
  },
  {
    source: 'review-323',
    target: 'review-324',
    relation: 'CONTAINS',
  },
  {
    source: 'review-315',
    target: 'review-325',
    relation: 'CONTAINS',
  },
  {
    source: 'review-325',
    target: 'review-326',
    relation: 'CONTAINS',
  },
  {
    source: 'review-315',
    target: 'review-327',
    relation: 'CONTAINS',
  },
  {
    source: 'review-327',
    target: 'review-328',
    relation: 'CONTAINS',
  },
  {
    source: 'review-315',
    target: 'review-329',
    relation: 'CONTAINS',
  },
  {
    source: 'review-329',
    target: 'review-330',
    relation: 'CONTAINS',
  },
  {
    source: 'review-329',
    target: 'review-331',
    relation: 'CONTAINS',
  },
  {
    source: 'review-329',
    target: 'review-332',
    relation: 'CONTAINS',
  },
  {
    source: 'review-303',
    target: 'review-333',
    relation: 'CONTAINS',
  },
  {
    source: 'review-333',
    target: 'review-334',
    relation: 'CONTAINS',
  },
  {
    source: 'review-333',
    target: 'review-335',
    relation: 'CONTAINS',
  },
  {
    source: 'review-335',
    target: 'review-336',
    relation: 'CONTAINS',
  },
  {
    source: 'review-336',
    target: 'review-337',
    relation: 'CONTAINS',
  },
  {
    source: 'review-336',
    target: 'review-338',
    relation: 'CONTAINS',
  },
  {
    source: 'review-336',
    target: 'review-339',
    relation: 'CONTAINS',
  },
  {
    source: 'review-333',
    target: 'review-340',
    relation: 'CONTAINS',
  },
  {
    source: 'review-333',
    target: 'review-341',
    relation: 'CONTAINS',
  },
  {
    source: 'review-333',
    target: 'review-342',
    relation: 'CONTAINS',
  },
  {
    source: 'review-333',
    target: 'review-343',
    relation: 'CONTAINS',
  },
  {
    source: 'review-333',
    target: 'review-344',
    relation: 'CONTAINS',
  },
  {
    source: 'review-344',
    target: 'review-345',
    relation: 'CONTAINS',
  },
  {
    source: 'review-345',
    target: 'review-346',
    relation: 'CONTAINS',
  },
  {
    source: 'review-344',
    target: 'review-347',
    relation: 'CONTAINS',
  },
  {
    source: 'review-347',
    target: 'review-348',
    relation: 'CONTAINS',
  },
  {
    source: 'review-347',
    target: 'review-349',
    relation: 'CONTAINS',
  },
  {
    source: 'review-347',
    target: 'review-350',
    relation: 'CONTAINS',
  },
  {
    source: 'review-350',
    target: 'review-351',
    relation: 'CONTAINS',
  },
  {
    source: 'review-347',
    target: 'review-352',
    relation: 'CONTAINS',
  },
  {
    source: 'review-347',
    target: 'review-353',
    relation: 'CONTAINS',
  },
  {
    source: 'review-344',
    target: 'review-354',
    relation: 'CONTAINS',
  },
  {
    source: 'review-354',
    target: 'review-355',
    relation: 'CONTAINS',
  },
  {
    source: 'review-354',
    target: 'review-356',
    relation: 'CONTAINS',
  },
  {
    source: 'review-354',
    target: 'review-357',
    relation: 'CONTAINS',
  },
  {
    source: 'review-294',
    target: 'review-358',
    relation: 'CONTAINS',
  },
  {
    source: 'review-358',
    target: 'review-359',
    relation: 'CONTAINS',
  },
  {
    source: 'review-359',
    target: 'review-360',
    relation: 'CONTAINS',
  },
  {
    source: 'review-359',
    target: 'review-361',
    relation: 'CONTAINS',
  },
  {
    source: 'review-358',
    target: 'review-362',
    relation: 'CONTAINS',
  },
  {
    source: 'review-358',
    target: 'review-363',
    relation: 'CONTAINS',
  },
  {
    source: 'review-358',
    target: 'review-364',
    relation: 'CONTAINS',
  },
  {
    source: 'review-358',
    target: 'review-365',
    relation: 'CONTAINS',
  },
  {
    source: 'review-294',
    target: 'review-366',
    relation: 'CONTAINS',
  },
  {
    source: 'review-366',
    target: 'review-367',
    relation: 'CONTAINS',
  },
  {
    source: 'review-367',
    target: 'review-368',
    relation: 'CONTAINS',
  },
  {
    source: 'review-368',
    target: 'review-369',
    relation: 'CONTAINS',
  },
  {
    source: 'review-369',
    target: 'review-370',
    relation: 'CONTAINS',
  },
  {
    source: 'review-368',
    target: 'review-371',
    relation: 'CONTAINS',
  },
  {
    source: 'review-367',
    target: 'review-372',
    relation: 'CONTAINS',
  },
  {
    source: 'review-366',
    target: 'review-373',
    relation: 'CONTAINS',
  },
  {
    source: 'review-373',
    target: 'review-374',
    relation: 'CONTAINS',
  },
  {
    source: 'review-373',
    target: 'review-375',
    relation: 'CONTAINS',
  },
  {
    source: 'review-373',
    target: 'review-376',
    relation: 'CONTAINS',
  },
  {
    source: 'review-366',
    target: 'review-377',
    relation: 'CONTAINS',
  },
  {
    source: 'review-294',
    target: 'review-378',
    relation: 'CONTAINS',
  },
  {
    source: 'review-378',
    target: 'review-379',
    relation: 'CONTAINS',
  },
  {
    source: 'review-379',
    target: 'review-380',
    relation: 'CONTAINS',
  },
  {
    source: 'review-379',
    target: 'review-381',
    relation: 'CONTAINS',
  },
  {
    source: 'review-379',
    target: 'review-382',
    relation: 'CONTAINS',
  },
  {
    source: 'review-379',
    target: 'review-383',
    relation: 'CONTAINS',
  },
  {
    source: 'review-379',
    target: 'review-384',
    relation: 'CONTAINS',
  },
  {
    source: 'review-378',
    target: 'review-385',
    relation: 'CONTAINS',
  },
  {
    source: 'review-378',
    target: 'review-386',
    relation: 'CONTAINS',
  },
  {
    source: 'review-386',
    target: 'review-387',
    relation: 'CONTAINS',
  },
  {
    source: 'review-386',
    target: 'review-388',
    relation: 'CONTAINS',
  },
  {
    source: 'review-294',
    target: 'review-389',
    relation: 'CONTAINS',
  },
  {
    source: 'review-389',
    target: 'review-390',
    relation: 'CONTAINS',
  },
  {
    source: 'review-390',
    target: 'review-391',
    relation: 'CONTAINS',
  },
  {
    source: 'review-391',
    target: 'review-392',
    relation: 'CONTAINS',
  },
  {
    source: 'review-391',
    target: 'review-393',
    relation: 'CONTAINS',
  },
  {
    source: 'review-391',
    target: 'review-394',
    relation: 'CONTAINS',
  },
  {
    source: 'review-391',
    target: 'review-395',
    relation: 'CONTAINS',
  },
  {
    source: 'review-390',
    target: 'review-396',
    relation: 'CONTAINS',
  },
  {
    source: 'review-389',
    target: 'review-397',
    relation: 'CONTAINS',
  },
  {
    source: 'review-397',
    target: 'review-398',
    relation: 'CONTAINS',
  },
  {
    source: 'review-398',
    target: 'review-399',
    relation: 'CONTAINS',
  },
  {
    source: 'review-398',
    target: 'review-400',
    relation: 'CONTAINS',
  },
  {
    source: 'review-398',
    target: 'review-401',
    relation: 'CONTAINS',
  },
  {
    source: 'review-398',
    target: 'review-402',
    relation: 'CONTAINS',
  },
  {
    source: 'review-397',
    target: 'review-403',
    relation: 'CONTAINS',
  },
  {
    source: 'review-389',
    target: 'review-404',
    relation: 'CONTAINS',
  },
  {
    source: 'review-404',
    target: 'review-405',
    relation: 'CONTAINS',
  },
  {
    source: 'review-405',
    target: 'review-406',
    relation: 'CONTAINS',
  },
  {
    source: 'review-405',
    target: 'review-407',
    relation: 'CONTAINS',
  },
  {
    source: 'review-389',
    target: 'review-408',
    relation: 'CONTAINS',
  },
  {
    source: 'review-294',
    target: 'review-409',
    relation: 'CONTAINS',
  },
  {
    source: 'review-409',
    target: 'review-410',
    relation: 'CONTAINS',
  },
  {
    source: 'review-410',
    target: 'review-411',
    relation: 'CONTAINS',
  },
  {
    source: 'review-410',
    target: 'review-412',
    relation: 'CONTAINS',
  },
  {
    source: 'review-412',
    target: 'review-413',
    relation: 'CONTAINS',
  },
  {
    source: 'review-409',
    target: 'review-414',
    relation: 'CONTAINS',
  },
  {
    source: 'review-414',
    target: 'review-415',
    relation: 'CONTAINS',
  },
  {
    source: 'review-415',
    target: 'review-416',
    relation: 'CONTAINS',
  },
  {
    source: 'review-415',
    target: 'review-417',
    relation: 'CONTAINS',
  },
  {
    source: 'review-415',
    target: 'review-418',
    relation: 'CONTAINS',
  },
  {
    source: 'review-414',
    target: 'review-419',
    relation: 'CONTAINS',
  },
  {
    source: 'review-414',
    target: 'review-420',
    relation: 'CONTAINS',
  },
  {
    source: 'review-414',
    target: 'review-421',
    relation: 'CONTAINS',
  },
  {
    source: 'review-421',
    target: 'review-422',
    relation: 'CONTAINS',
  },
  {
    source: 'review-409',
    target: 'review-423',
    relation: 'CONTAINS',
  },
  {
    source: 'review-423',
    target: 'review-424',
    relation: 'CONTAINS',
  },
  {
    source: 'review-423',
    target: 'review-425',
    relation: 'CONTAINS',
  },
  {
    source: 'review-294',
    target: 'review-426',
    relation: 'CONTAINS',
  },
  {
    source: 'review-426',
    target: 'review-427',
    relation: 'CONTAINS',
  },
  {
    source: 'review-426',
    target: 'review-428',
    relation: 'CONTAINS',
  },
  {
    source: 'review-426',
    target: 'review-429',
    relation: 'CONTAINS',
  },
  {
    source: 'review-426',
    target: 'review-430',
    relation: 'CONTAINS',
  },
  {
    source: 'review-294',
    target: 'review-431',
    relation: 'CONTAINS',
  },
  {
    source: 'review-431',
    target: 'review-432',
    relation: 'CONTAINS',
  },
  {
    source: 'review-432',
    target: 'review-433',
    relation: 'CONTAINS',
  },
  {
    source: 'review-433',
    target: 'review-434',
    relation: 'CONTAINS',
  },
  {
    source: 'review-433',
    target: 'review-435',
    relation: 'CONTAINS',
  },
  {
    source: 'review-431',
    target: 'review-436',
    relation: 'CONTAINS',
  },
  {
    source: 'review-436',
    target: 'review-437',
    relation: 'CONTAINS',
  },
  {
    source: 'review-437',
    target: 'review-438',
    relation: 'CONTAINS',
  },
  {
    source: 'review-438',
    target: 'review-439',
    relation: 'CONTAINS',
  },
  {
    source: 'review-438',
    target: 'review-440',
    relation: 'CONTAINS',
  },
  {
    source: 'review-438',
    target: 'review-441',
    relation: 'CONTAINS',
  },
  {
    source: 'review-441',
    target: 'review-442',
    relation: 'CONTAINS',
  },
  {
    source: 'review-441',
    target: 'review-443',
    relation: 'CONTAINS',
  },
  {
    source: 'review-441',
    target: 'review-444',
    relation: 'CONTAINS',
  },
  {
    source: 'review-438',
    target: 'review-445',
    relation: 'CONTAINS',
  },
  {
    source: 'review-438',
    target: 'review-446',
    relation: 'CONTAINS',
  },
  {
    source: 'review-446',
    target: 'review-447',
    relation: 'CONTAINS',
  },
  {
    source: 'review-446',
    target: 'review-448',
    relation: 'CONTAINS',
  },
  {
    source: 'review-437',
    target: 'review-449',
    relation: 'CONTAINS',
  },
  {
    source: 'review-449',
    target: 'review-450',
    relation: 'CONTAINS',
  },
  {
    source: 'review-449',
    target: 'review-451',
    relation: 'CONTAINS',
  },
  {
    source: 'review-449',
    target: 'review-452',
    relation: 'CONTAINS',
  },
  {
    source: 'review-452',
    target: 'review-453',
    relation: 'CONTAINS',
  },
  {
    source: 'review-452',
    target: 'review-454',
    relation: 'CONTAINS',
  },
  {
    source: 'review-449',
    target: 'review-455',
    relation: 'CONTAINS',
  },
  {
    source: 'review-455',
    target: 'review-456',
    relation: 'CONTAINS',
  },
  {
    source: 'review-455',
    target: 'review-457',
    relation: 'CONTAINS',
  },
  {
    source: 'review-455',
    target: 'review-458',
    relation: 'CONTAINS',
  },
  {
    source: 'review-449',
    target: 'review-459',
    relation: 'CONTAINS',
  },
  {
    source: 'review-459',
    target: 'review-460',
    relation: 'CONTAINS',
  },
  {
    source: 'review-459',
    target: 'review-461',
    relation: 'CONTAINS',
  },
  {
    source: 'review-459',
    target: 'review-462',
    relation: 'CONTAINS',
  },
  {
    source: 'review-459',
    target: 'review-463',
    relation: 'CONTAINS',
  },
  {
    source: 'review-459',
    target: 'review-464',
    relation: 'CONTAINS',
  },
  {
    source: 'review-449',
    target: 'review-465',
    relation: 'CONTAINS',
  },
  {
    source: 'review-465',
    target: 'review-466',
    relation: 'CONTAINS',
  },
  {
    source: 'review-465',
    target: 'review-467',
    relation: 'CONTAINS',
  },
  {
    source: 'review-465',
    target: 'review-468',
    relation: 'CONTAINS',
  },
  {
    source: 'review-436',
    target: 'review-469',
    relation: 'CONTAINS',
  },
  {
    source: 'review-469',
    target: 'review-470',
    relation: 'CONTAINS',
  },
  {
    source: 'review-470',
    target: 'review-471',
    relation: 'CONTAINS',
  },
  {
    source: 'review-470',
    target: 'review-472',
    relation: 'CONTAINS',
  },
  {
    source: 'review-470',
    target: 'review-473',
    relation: 'CONTAINS',
  },
  {
    source: 'review-473',
    target: 'review-474',
    relation: 'CONTAINS',
  },
  {
    source: 'review-473',
    target: 'review-475',
    relation: 'CONTAINS',
  },
  {
    source: 'review-473',
    target: 'review-476',
    relation: 'CONTAINS',
  },
  {
    source: 'review-473',
    target: 'review-477',
    relation: 'CONTAINS',
  },
  {
    source: 'review-470',
    target: 'review-478',
    relation: 'CONTAINS',
  },
  {
    source: 'review-294',
    target: 'review-479',
    relation: 'CONTAINS',
  },
  {
    source: 'review-479',
    target: 'review-480',
    relation: 'CONTAINS',
  },
  {
    source: 'review-480',
    target: 'review-481',
    relation: 'CONTAINS',
  },
  {
    source: 'review-480',
    target: 'review-482',
    relation: 'CONTAINS',
  },
  {
    source: 'review-480',
    target: 'review-483',
    relation: 'CONTAINS',
  },
  {
    source: 'review-479',
    target: 'review-484',
    relation: 'CONTAINS',
  },
  {
    source: 'review-479',
    target: 'review-485',
    relation: 'CONTAINS',
  },
  {
    source: 'review-294',
    target: 'review-486',
    relation: 'CONTAINS',
  },
  {
    source: 'review-486',
    target: 'review-487',
    relation: 'CONTAINS',
  },
  {
    source: 'review-486',
    target: 'review-488',
    relation: 'CONTAINS',
  },
  {
    source: 'review-486',
    target: 'review-489',
    relation: 'CONTAINS',
  },
  {
    source: 'review-489',
    target: 'review-490',
    relation: 'CONTAINS',
  },
  {
    source: 'review-489',
    target: 'review-491',
    relation: 'CONTAINS',
  },
  {
    source: 'review-489',
    target: 'review-492',
    relation: 'CONTAINS',
  },
  {
    source: 'review-0',
    target: 'review-493',
    relation: 'CONTAINS',
  },
  {
    source: 'review-493',
    target: 'review-494',
    relation: 'CONTAINS',
  },
  {
    source: 'review-494',
    target: 'review-495',
    relation: 'CONTAINS',
  },
  {
    source: 'review-494',
    target: 'review-496',
    relation: 'CONTAINS',
  },
  {
    source: 'review-496',
    target: 'review-497',
    relation: 'CONTAINS',
  },
  {
    source: 'review-496',
    target: 'review-498',
    relation: 'CONTAINS',
  },
  {
    source: 'review-496',
    target: 'review-499',
    relation: 'CONTAINS',
  },
  {
    source: 'review-493',
    target: 'review-500',
    relation: 'CONTAINS',
  },
  {
    source: 'review-500',
    target: 'review-501',
    relation: 'CONTAINS',
  },
  {
    source: 'review-501',
    target: 'review-502',
    relation: 'CONTAINS',
  },
  {
    source: 'review-501',
    target: 'review-503',
    relation: 'CONTAINS',
  },
  {
    source: 'review-503',
    target: 'review-504',
    relation: 'CONTAINS',
  },
  {
    source: 'review-504',
    target: 'review-505',
    relation: 'CONTAINS',
  },
  {
    source: 'review-504',
    target: 'review-506',
    relation: 'CONTAINS',
  },
  {
    source: 'review-504',
    target: 'review-507',
    relation: 'CONTAINS',
  },
  {
    source: 'review-504',
    target: 'review-508',
    relation: 'CONTAINS',
  },
  {
    source: 'review-504',
    target: 'review-509',
    relation: 'CONTAINS',
  },
  {
    source: 'review-503',
    target: 'review-510',
    relation: 'CONTAINS',
  },
  {
    source: 'review-503',
    target: 'review-511',
    relation: 'CONTAINS',
  },
  {
    source: 'review-500',
    target: 'review-512',
    relation: 'CONTAINS',
  },
  {
    source: 'review-512',
    target: 'review-513',
    relation: 'CONTAINS',
  },
  {
    source: 'review-512',
    target: 'review-514',
    relation: 'CONTAINS',
  },
  {
    source: 'review-512',
    target: 'review-515',
    relation: 'CONTAINS',
  },
  {
    source: 'review-512',
    target: 'review-516',
    relation: 'CONTAINS',
  },
  {
    source: 'review-500',
    target: 'review-517',
    relation: 'CONTAINS',
  },
  {
    source: 'review-517',
    target: 'review-518',
    relation: 'CONTAINS',
  },
  {
    source: 'review-517',
    target: 'review-519',
    relation: 'CONTAINS',
  },
  {
    source: 'review-517',
    target: 'review-520',
    relation: 'CONTAINS',
  },
  {
    source: 'review-517',
    target: 'review-521',
    relation: 'CONTAINS',
  },
  {
    source: 'review-493',
    target: 'review-522',
    relation: 'CONTAINS',
  },
  {
    source: 'review-522',
    target: 'review-523',
    relation: 'CONTAINS',
  },
  {
    source: 'review-523',
    target: 'review-524',
    relation: 'CONTAINS',
  },
  {
    source: 'review-523',
    target: 'review-525',
    relation: 'CONTAINS',
  },
  {
    source: 'review-523',
    target: 'review-526',
    relation: 'CONTAINS',
  },
  {
    source: 'review-523',
    target: 'review-527',
    relation: 'CONTAINS',
  },
  {
    source: 'review-523',
    target: 'review-528',
    relation: 'CONTAINS',
  },
  {
    source: 'review-522',
    target: 'review-529',
    relation: 'CONTAINS',
  },
  {
    source: 'review-529',
    target: 'review-530',
    relation: 'CONTAINS',
  },
  {
    source: 'review-529',
    target: 'review-531',
    relation: 'CONTAINS',
  },
  {
    source: 'review-522',
    target: 'review-532',
    relation: 'CONTAINS',
  },
  {
    source: 'review-532',
    target: 'review-533',
    relation: 'CONTAINS',
  },
  {
    source: 'review-533',
    target: 'review-534',
    relation: 'CONTAINS',
  },
  {
    source: 'review-534',
    target: 'review-535',
    relation: 'CONTAINS',
  },
  {
    source: 'review-535',
    target: 'review-536',
    relation: 'CONTAINS',
  },
  {
    source: 'review-535',
    target: 'review-537',
    relation: 'CONTAINS',
  },
  {
    source: 'review-535',
    target: 'review-538',
    relation: 'CONTAINS',
  },
  {
    source: 'review-535',
    target: 'review-539',
    relation: 'CONTAINS',
  },
  {
    source: 'review-535',
    target: 'review-540',
    relation: 'CONTAINS',
  },
  {
    source: 'review-534',
    target: 'review-541',
    relation: 'CONTAINS',
  },
  {
    source: 'review-533',
    target: 'review-542',
    relation: 'CONTAINS',
  },
  {
    source: 'review-542',
    target: 'review-543',
    relation: 'CONTAINS',
  },
  {
    source: 'review-542',
    target: 'review-544',
    relation: 'CONTAINS',
  },
  {
    source: 'review-544',
    target: 'review-545',
    relation: 'CONTAINS',
  },
  {
    source: 'review-542',
    target: 'review-546',
    relation: 'CONTAINS',
  },
  {
    source: 'review-542',
    target: 'review-547',
    relation: 'CONTAINS',
  },
  {
    source: 'review-532',
    target: 'review-548',
    relation: 'CONTAINS',
  },
  {
    source: 'review-493',
    target: 'review-549',
    relation: 'CONTAINS',
  },
  {
    source: 'review-549',
    target: 'review-550',
    relation: 'CONTAINS',
  },
  {
    source: 'review-550',
    target: 'review-551',
    relation: 'CONTAINS',
  },
  {
    source: 'review-550',
    target: 'review-552',
    relation: 'CONTAINS',
  },
  {
    source: 'review-550',
    target: 'review-553',
    relation: 'CONTAINS',
  },
  {
    source: 'review-550',
    target: 'review-554',
    relation: 'CONTAINS',
  },
  {
    source: 'review-549',
    target: 'review-555',
    relation: 'CONTAINS',
  },
  {
    source: 'review-555',
    target: 'review-556',
    relation: 'CONTAINS',
  },
  {
    source: 'review-555',
    target: 'review-557',
    relation: 'CONTAINS',
  },
  {
    source: 'review-555',
    target: 'review-558',
    relation: 'CONTAINS',
  },
  {
    source: 'review-555',
    target: 'review-559',
    relation: 'CONTAINS',
  },
  {
    source: 'review-493',
    target: 'review-560',
    relation: 'CONTAINS',
  },
  {
    source: 'review-560',
    target: 'review-561',
    relation: 'CONTAINS',
  },
  {
    source: 'review-560',
    target: 'review-562',
    relation: 'CONTAINS',
  },
  {
    source: 'review-560',
    target: 'review-563',
    relation: 'CONTAINS',
  },
  {
    source: 'review-563',
    target: 'review-564',
    relation: 'CONTAINS',
  },
  {
    source: 'review-563',
    target: 'review-565',
    relation: 'CONTAINS',
  },
  {
    source: 'review-493',
    target: 'review-566',
    relation: 'CONTAINS',
  },
  {
    source: 'review-566',
    target: 'review-567',
    relation: 'CONTAINS',
  },
  {
    source: 'review-566',
    target: 'review-568',
    relation: 'CONTAINS',
  },
  {
    source: 'review-566',
    target: 'review-569',
    relation: 'CONTAINS',
  },
  {
    source: 'review-566',
    target: 'review-570',
    relation: 'CONTAINS',
  },
  {
    source: 'review-566',
    target: 'review-571',
    relation: 'CONTAINS',
  },
  {
    source: 'review-493',
    target: 'review-572',
    relation: 'CONTAINS',
  },
  {
    source: 'review-572',
    target: 'review-573',
    relation: 'CONTAINS',
  },
  {
    source: 'review-572',
    target: 'review-574',
    relation: 'CONTAINS',
  },
  {
    source: 'review-574',
    target: 'review-575',
    relation: 'CONTAINS',
  },
  {
    source: 'review-574',
    target: 'review-576',
    relation: 'CONTAINS',
  },
  {
    source: 'review-572',
    target: 'review-577',
    relation: 'CONTAINS',
  },
  {
    source: 'review-577',
    target: 'review-578',
    relation: 'CONTAINS',
  },
  {
    source: 'review-572',
    target: 'review-579',
    relation: 'CONTAINS',
  },
  {
    source: 'review-579',
    target: 'review-580',
    relation: 'CONTAINS',
  },
  {
    source: 'review-572',
    target: 'review-581',
    relation: 'CONTAINS',
  },
  {
    source: 'review-581',
    target: 'review-582',
    relation: 'CONTAINS',
  },
  {
    source: 'review-572',
    target: 'review-583',
    relation: 'CONTAINS',
  },
  {
    source: 'review-583',
    target: 'review-584',
    relation: 'CONTAINS',
  },
  {
    source: 'review-572',
    target: 'review-585',
    relation: 'CONTAINS',
  },
  {
    source: 'review-572',
    target: 'review-586',
    relation: 'CONTAINS',
  },
  {
    source: 'review-572',
    target: 'review-587',
    relation: 'CONTAINS',
  },
  {
    source: 'review-493',
    target: 'review-588',
    relation: 'CONTAINS',
  },
  {
    source: 'review-588',
    target: 'review-589',
    relation: 'CONTAINS',
  },
  {
    source: 'review-589',
    target: 'review-590',
    relation: 'CONTAINS',
  },
  {
    source: 'review-588',
    target: 'review-591',
    relation: 'CONTAINS',
  },
  {
    source: 'review-591',
    target: 'review-592',
    relation: 'CONTAINS',
  },
  {
    source: 'review-493',
    target: 'review-593',
    relation: 'CONTAINS',
  },
  {
    source: 'review-593',
    target: 'review-594',
    relation: 'CONTAINS',
  },
  {
    source: 'review-594',
    target: 'review-595',
    relation: 'CONTAINS',
  },
  {
    source: 'review-594',
    target: 'review-596',
    relation: 'CONTAINS',
  },
  {
    source: 'review-594',
    target: 'review-597',
    relation: 'CONTAINS',
  },
  {
    source: 'review-593',
    target: 'review-598',
    relation: 'CONTAINS',
  },
  {
    source: 'review-598',
    target: 'review-599',
    relation: 'CONTAINS',
  },
  {
    source: 'review-598',
    target: 'review-600',
    relation: 'CONTAINS',
  },
  {
    source: 'review-598',
    target: 'review-601',
    relation: 'CONTAINS',
  },
  {
    source: 'review-598',
    target: 'review-602',
    relation: 'CONTAINS',
  },
  {
    source: 'review-598',
    target: 'review-603',
    relation: 'CONTAINS',
  },
  {
    source: 'review-593',
    target: 'review-604',
    relation: 'CONTAINS',
  },
  {
    source: 'review-593',
    target: 'review-605',
    relation: 'CONTAINS',
  },
  {
    source: 'review-0',
    target: 'review-606',
    relation: 'CONTAINS',
  },
  {
    source: 'review-606',
    target: 'review-607',
    relation: 'CONTAINS',
  },
  {
    source: 'review-607',
    target: 'review-608',
    relation: 'CONTAINS',
  },
  {
    source: 'review-608',
    target: 'review-609',
    relation: 'CONTAINS',
  },
  {
    source: 'review-608',
    target: 'review-610',
    relation: 'CONTAINS',
  },
  {
    source: 'review-608',
    target: 'review-611',
    relation: 'CONTAINS',
  },
  {
    source: 'review-608',
    target: 'review-612',
    relation: 'CONTAINS',
  },
  {
    source: 'review-612',
    target: 'review-613',
    relation: 'CONTAINS',
  },
  {
    source: 'review-607',
    target: 'review-614',
    relation: 'CONTAINS',
  },
  {
    source: 'review-614',
    target: 'review-615',
    relation: 'CONTAINS',
  },
  {
    source: 'review-614',
    target: 'review-616',
    relation: 'CONTAINS',
  },
  {
    source: 'review-614',
    target: 'review-617',
    relation: 'CONTAINS',
  },
  {
    source: 'review-614',
    target: 'review-618',
    relation: 'CONTAINS',
  },
  {
    source: 'review-607',
    target: 'review-619',
    relation: 'CONTAINS',
  },
  {
    source: 'review-619',
    target: 'review-620',
    relation: 'CONTAINS',
  },
  {
    source: 'review-619',
    target: 'review-621',
    relation: 'CONTAINS',
  },
  {
    source: 'review-621',
    target: 'review-622',
    relation: 'CONTAINS',
  },
  {
    source: 'review-621',
    target: 'review-623',
    relation: 'CONTAINS',
  },
  {
    source: 'review-619',
    target: 'review-624',
    relation: 'CONTAINS',
  },
  {
    source: 'review-619',
    target: 'review-625',
    relation: 'CONTAINS',
  },
  {
    source: 'review-619',
    target: 'review-626',
    relation: 'CONTAINS',
  },
  {
    source: 'review-607',
    target: 'review-627',
    relation: 'CONTAINS',
  },
  {
    source: 'review-627',
    target: 'review-628',
    relation: 'CONTAINS',
  },
  {
    source: 'review-627',
    target: 'review-629',
    relation: 'CONTAINS',
  },
  {
    source: 'review-607',
    target: 'review-630',
    relation: 'CONTAINS',
  },
  {
    source: 'review-607',
    target: 'review-631',
    relation: 'CONTAINS',
  },
  {
    source: 'review-631',
    target: 'review-632',
    relation: 'CONTAINS',
  },
  {
    source: 'review-631',
    target: 'review-633',
    relation: 'CONTAINS',
  },
  {
    source: 'review-606',
    target: 'review-634',
    relation: 'CONTAINS',
  },
  {
    source: 'review-634',
    target: 'review-635',
    relation: 'CONTAINS',
  },
  {
    source: 'review-634',
    target: 'review-636',
    relation: 'CONTAINS',
  },
  {
    source: 'review-636',
    target: 'review-637',
    relation: 'CONTAINS',
  },
  {
    source: 'review-634',
    target: 'review-638',
    relation: 'CONTAINS',
  },
  {
    source: 'review-638',
    target: 'review-639',
    relation: 'CONTAINS',
  },
  {
    source: 'review-634',
    target: 'review-640',
    relation: 'CONTAINS',
  },
  {
    source: 'review-640',
    target: 'review-641',
    relation: 'CONTAINS',
  },
  {
    source: 'review-640',
    target: 'review-642',
    relation: 'CONTAINS',
  },
  {
    source: 'review-640',
    target: 'review-643',
    relation: 'CONTAINS',
  },
  {
    source: 'review-640',
    target: 'review-644',
    relation: 'CONTAINS',
  },
  {
    source: 'review-640',
    target: 'review-645',
    relation: 'CONTAINS',
  },
  {
    source: 'review-640',
    target: 'review-646',
    relation: 'CONTAINS',
  },
  {
    source: 'review-646',
    target: 'review-647',
    relation: 'CONTAINS',
  },
  {
    source: 'review-647',
    target: 'review-648',
    relation: 'CONTAINS',
  },
  {
    source: 'review-647',
    target: 'review-649',
    relation: 'CONTAINS',
  },
  {
    source: 'review-646',
    target: 'review-650',
    relation: 'CONTAINS',
  },
  {
    source: 'review-646',
    target: 'review-651',
    relation: 'CONTAINS',
  },
  {
    source: 'review-646',
    target: 'review-652',
    relation: 'CONTAINS',
  },
  {
    source: 'review-640',
    target: 'review-653',
    relation: 'CONTAINS',
  },
  {
    source: 'review-653',
    target: 'review-654',
    relation: 'CONTAINS',
  },
  {
    source: 'review-634',
    target: 'review-655',
    relation: 'CONTAINS',
  },
  {
    source: 'review-655',
    target: 'review-656',
    relation: 'CONTAINS',
  },
  {
    source: 'review-655',
    target: 'review-657',
    relation: 'CONTAINS',
  },
  {
    source: 'review-655',
    target: 'review-658',
    relation: 'CONTAINS',
  },
  {
    source: 'review-634',
    target: 'review-659',
    relation: 'CONTAINS',
  },
  {
    source: 'review-659',
    target: 'review-660',
    relation: 'CONTAINS',
  },
  {
    source: 'review-659',
    target: 'review-661',
    relation: 'CONTAINS',
  },
  {
    source: 'review-634',
    target: 'review-662',
    relation: 'CONTAINS',
  },
  {
    source: 'review-662',
    target: 'review-663',
    relation: 'CONTAINS',
  },
  {
    source: 'review-662',
    target: 'review-664',
    relation: 'CONTAINS',
  },
  {
    source: 'review-662',
    target: 'review-665',
    relation: 'CONTAINS',
  },
  {
    source: 'review-662',
    target: 'review-666',
    relation: 'CONTAINS',
  },
  {
    source: 'review-634',
    target: 'review-667',
    relation: 'CONTAINS',
  },
  {
    source: 'review-606',
    target: 'review-668',
    relation: 'CONTAINS',
  },
  {
    source: 'review-668',
    target: 'review-669',
    relation: 'CONTAINS',
  },
  {
    source: 'review-669',
    target: 'review-670',
    relation: 'CONTAINS',
  },
  {
    source: 'review-669',
    target: 'review-671',
    relation: 'CONTAINS',
  },
  {
    source: 'review-671',
    target: 'review-672',
    relation: 'CONTAINS',
  },
  {
    source: 'review-671',
    target: 'review-673',
    relation: 'CONTAINS',
  },
  {
    source: 'review-671',
    target: 'review-674',
    relation: 'CONTAINS',
  },
  {
    source: 'review-669',
    target: 'review-675',
    relation: 'CONTAINS',
  },
  {
    source: 'review-675',
    target: 'review-676',
    relation: 'CONTAINS',
  },
  {
    source: 'review-676',
    target: 'review-677',
    relation: 'CONTAINS',
  },
  {
    source: 'review-676',
    target: 'review-678',
    relation: 'CONTAINS',
  },
  {
    source: 'review-676',
    target: 'review-679',
    relation: 'CONTAINS',
  },
  {
    source: 'review-675',
    target: 'review-680',
    relation: 'CONTAINS',
  },
  {
    source: 'review-680',
    target: 'review-681',
    relation: 'CONTAINS',
  },
  {
    source: 'review-680',
    target: 'review-682',
    relation: 'CONTAINS',
  },
  {
    source: 'review-675',
    target: 'review-683',
    relation: 'CONTAINS',
  },
  {
    source: 'review-683',
    target: 'review-684',
    relation: 'CONTAINS',
  },
  {
    source: 'review-683',
    target: 'review-685',
    relation: 'CONTAINS',
  },
  {
    source: 'review-683',
    target: 'review-686',
    relation: 'CONTAINS',
  },
  {
    source: 'review-668',
    target: 'review-687',
    relation: 'CONTAINS',
  },
  {
    source: 'review-687',
    target: 'review-688',
    relation: 'CONTAINS',
  },
  {
    source: 'review-687',
    target: 'review-689',
    relation: 'CONTAINS',
  },
  {
    source: 'review-689',
    target: 'review-690',
    relation: 'CONTAINS',
  },
  {
    source: 'review-689',
    target: 'review-691',
    relation: 'CONTAINS',
  },
  {
    source: 'review-668',
    target: 'review-692',
    relation: 'CONTAINS',
  },
  {
    source: 'review-692',
    target: 'review-693',
    relation: 'CONTAINS',
  },
  {
    source: 'review-692',
    target: 'review-694',
    relation: 'CONTAINS',
  },
  {
    source: 'review-668',
    target: 'review-695',
    relation: 'CONTAINS',
  },
  {
    source: 'review-695',
    target: 'review-696',
    relation: 'CONTAINS',
  },
  {
    source: 'review-696',
    target: 'review-697',
    relation: 'CONTAINS',
  },
  {
    source: 'review-695',
    target: 'review-698',
    relation: 'CONTAINS',
  },
  {
    source: 'review-698',
    target: 'review-699',
    relation: 'CONTAINS',
  },
  {
    source: 'review-698',
    target: 'review-700',
    relation: 'CONTAINS',
  },
  {
    source: 'review-695',
    target: 'review-701',
    relation: 'CONTAINS',
  },
  {
    source: 'review-668',
    target: 'review-702',
    relation: 'CONTAINS',
  },
  {
    source: 'review-606',
    target: 'review-703',
    relation: 'CONTAINS',
  },
  {
    source: 'review-703',
    target: 'review-704',
    relation: 'CONTAINS',
  },
  {
    source: 'review-703',
    target: 'review-705',
    relation: 'CONTAINS',
  },
  {
    source: 'review-703',
    target: 'review-706',
    relation: 'CONTAINS',
  },
  {
    source: 'review-706',
    target: 'review-707',
    relation: 'CONTAINS',
  },
  {
    source: 'review-706',
    target: 'review-708',
    relation: 'CONTAINS',
  },
  {
    source: 'review-706',
    target: 'review-709',
    relation: 'CONTAINS',
  },
  {
    source: 'review-706',
    target: 'review-710',
    relation: 'CONTAINS',
  },
  {
    source: 'review-703',
    target: 'review-711',
    relation: 'CONTAINS',
  },
  {
    source: 'review-711',
    target: 'review-712',
    relation: 'CONTAINS',
  },
  {
    source: 'review-711',
    target: 'review-713',
    relation: 'CONTAINS',
  },
  {
    source: 'review-703',
    target: 'review-714',
    relation: 'CONTAINS',
  },
  {
    source: 'review-714',
    target: 'review-715',
    relation: 'CONTAINS',
  },
  {
    source: 'review-714',
    target: 'review-716',
    relation: 'CONTAINS',
  },
  {
    source: 'review-703',
    target: 'review-717',
    relation: 'CONTAINS',
  },
  {
    source: 'review-717',
    target: 'review-718',
    relation: 'CONTAINS',
  },
  {
    source: 'review-717',
    target: 'review-719',
    relation: 'CONTAINS',
  },
  {
    source: 'review-703',
    target: 'review-720',
    relation: 'CONTAINS',
  },
  {
    source: 'review-606',
    target: 'review-721',
    relation: 'CONTAINS',
  },
  {
    source: 'review-721',
    target: 'review-722',
    relation: 'CONTAINS',
  },
  {
    source: 'review-721',
    target: 'review-723',
    relation: 'CONTAINS',
  },
  {
    source: 'review-723',
    target: 'review-724',
    relation: 'CONTAINS',
  },
  {
    source: 'review-724',
    target: 'review-725',
    relation: 'CONTAINS',
  },
  {
    source: 'review-725',
    target: 'review-726',
    relation: 'CONTAINS',
  },
  {
    source: 'review-725',
    target: 'review-727',
    relation: 'CONTAINS',
  },
  {
    source: 'review-725',
    target: 'review-728',
    relation: 'CONTAINS',
  },
  {
    source: 'review-723',
    target: 'review-729',
    relation: 'CONTAINS',
  },
  {
    source: 'review-729',
    target: 'review-730',
    relation: 'CONTAINS',
  },
  {
    source: 'review-730',
    target: 'review-731',
    relation: 'CONTAINS',
  },
  {
    source: 'review-730',
    target: 'review-732',
    relation: 'CONTAINS',
  },
  {
    source: 'review-730',
    target: 'review-733',
    relation: 'CONTAINS',
  },
] satisfies RawHierarchyEdge[]
