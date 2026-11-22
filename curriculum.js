// Original Chinese questions. Demonstrations: PythonRoboticsGifs, Copyright (c) 2016 Atsushi Sakai.
// MIT license: https://github.com/AtsushiSakai/PythonRoboticsGifs/blob/master/LICENSE
globalThis.curriculum = [
  {
    "id": "particle",
    "title": "粒子滤波定位",
    "group": "localization",
    "concept": "每颗粒子代表一个可能的机器人位姿。",
    "question": "两群粒子原先权重相同，新读数与甲群更吻合。重采样后通常怎样？",
    "options": [
      "甲群的粒子更多",
      "乙群的粒子更多",
      "两群必然一样多"
    ],
    "answer": 0,
    "explain": "读数越吻合，粒子的权重越大，按权重抽样时被保留的机会越高。",
    "url": "https://atsushisakai.github.io/PythonRobotics/modules/2_localization/particle_filter_localization/particle_filter_localization.html",
    "animation": "https://raw.githubusercontent.com/AtsushiSakai/PythonRoboticsGifs/d3e06807afda4e907861b9c28b263f5880daad37/Localization/particle_filter/animation.gif"
  },
  {
    "id": "ekf",
    "title": "扩展卡尔曼滤波",
    "group": "localization",
    "concept": "运动模型先预测，传感器读数再校正。",
    "question": "同一条读数偏离预测。若调大这只传感器的观测噪声，估计通常更靠近哪边？",
    "options": [
      "新读数",
      "两者固定的中点",
      "原来的预测"
    ],
    "answer": 2,
    "explain": "观测的可信度下降，校正时给这条读数的权重随之减小。",
    "url": "https://atsushisakai.github.io/PythonRobotics/modules/2_localization/extended_kalman_filter_localization_files/extended_kalman_filter_localization.html",
    "animation": "https://raw.githubusercontent.com/AtsushiSakai/PythonRoboticsGifs/d3e06807afda4e907861b9c28b263f5880daad37/Localization/extended_kalman_filter/animation.gif"
  },
  {
    "id": "gps-imu",
    "title": "GPS 与惯性传感器融合",
    "group": "localization",
    "concept": "融合定位能边走边估计传感器的测量偏差。",
    "question": "经过遮挡区时 GPS 暂时中断，惯性读数仍正常。滤波器此时可以做什么？",
    "options": [
      "用惯性数据继续预测",
      "把位置固定在入口",
      "把误差自动设为零"
    ],
    "answer": 0,
    "explain": "加速度和转速可用于短时推算，缺少位置观测时，累积误差会让预测越来越不确定。",
    "url": "https://atsushisakai.github.io/PythonRobotics/modules/2_localization/gps_imu_fusion/gps_imu_fusion.html",
    "animation": "https://raw.githubusercontent.com/AtsushiSakai/PythonRoboticsGifs/d3e06807afda4e907861b9c28b263f5880daad37/Localization/gps_imu_fusion/animation.gif"
  },
  {
    "id": "histogram",
    "title": "直方图定位",
    "group": "localization",
    "concept": "用每个格子的概率记录机器人可能的位置。",
    "question": "两个位置都完美匹配当前的测距读数。概率图可以怎样显示？",
    "options": [
      "强制取二者中点",
      "立即清除两个格子",
      "保留两个概率峰"
    ],
    "answer": 2,
    "explain": "网格可同时记录多个假设；后续有区分力的观测才会消除歧义。",
    "url": "https://atsushisakai.github.io/PythonRobotics/modules/2_localization/histogram_filter_localization/histogram_filter_localization.html",
    "animation": "https://raw.githubusercontent.com/AtsushiSakai/PythonRoboticsGifs/d3e06807afda4e907861b9c28b263f5880daad37/Localization/histogram_filter/animation.gif"
  },
  {
    "id": "ukf",
    "title": "无迹卡尔曼滤波",
    "group": "localization",
    "concept": "选取有权重的代表点，观察它们穿过非线性模型后的分布。",
    "question": "机器人转弯时，UKF 用什么估计转弯后的均值与不确定度？",
    "options": [
      "传播一组代表点并统计结果",
      "只传播均值所在的一点",
      "把位置方差永久固定"
    ],
    "answer": 0,
    "explain": "代表点携带了均值和协方差信息，经模型传播后，可用加权结果近似新的分布。",
    "url": "https://atsushisakai.github.io/PythonRobotics/modules/2_localization/unscented_kalman_filter_localization/unscented_kalman_filter_localization.html",
    "animation": "https://raw.githubusercontent.com/AtsushiSakai/PythonRoboticsGifs/d3e06807afda4e907861b9c28b263f5880daad37/Localization/unscented_kalman_filter/animation.gif"
  },
  {
    "id": "enkf",
    "title": "集合卡尔曼滤波",
    "group": "localization",
    "concept": "许多可能状态共同描述一个估计。",
    "question": "同一时刻，各个样本的位置散得更开。这组样本表示什么？",
    "options": [
      "机器人一定跑得更快",
      "传感器采样率更高",
      "位置估计的不确定性更大"
    ],
    "answer": 2,
    "explain": "集合的样本协方差反映成员之间的离散程度。",
    "url": "https://atsushisakai.github.io/PythonRobotics/modules/2_localization/ensamble_kalman_filter_localization_files/ensamble_kalman_filter_localization.html",
    "animation": "https://raw.githubusercontent.com/AtsushiSakai/PythonRoboticsGifs/d3e06807afda4e907861b9c28b263f5880daad37/Localization/ensamble_kalman_filter/animation.gif"
  },
  {
    "id": "kmeans",
    "title": "K-means 点云聚类",
    "group": "mapping",
    "concept": "交替进行按距离分组与重算中心。",
    "question": "某一组点的横坐标是 2、4、9。更新后这个中心的横坐标是多少？",
    "options": [
      "5",
      "4",
      "9"
    ],
    "answer": 0,
    "explain": "K-means 用组内坐标的算术平均数更新中心，三点横坐标的平均是 5。",
    "url": "https://atsushisakai.github.io/PythonRobotics/modules/3_mapping/k_means_object_clustering/k_means_object_clustering.html",
    "animation": "https://raw.githubusercontent.com/AtsushiSakai/PythonRoboticsGifs/d3e06807afda4e907861b9c28b263f5880daad37/Mapping/kmeans_clustering/animation.gif"
  },
  {
    "id": "gaussian",
    "title": "高斯栅格地图",
    "group": "mapping",
    "concept": "用随距离平滑变化的数值描述障碍物周围的空间。",
    "question": "只有一个障碍点，沿直线从它向外移动时，其高斯影响如何变化？",
    "options": [
      "越远越大",
      "每隔一格就反向",
      "越远越小"
    ],
    "answer": 2,
    "explain": "高斯函数在中心较大，随着距离增加而衰减。",
    "url": "https://atsushisakai.github.io/PythonRobotics/modules/3_mapping/gaussian_grid_map/gaussian_grid_map.html",
    "animation": "https://raw.githubusercontent.com/AtsushiSakai/PythonRoboticsGifs/d3e06807afda4e907861b9c28b263f5880daad37/Mapping/gaussian_grid_map/animation.gif"
  },
  {
    "id": "raycast",
    "title": "射线栅格建图",
    "group": "mapping",
    "concept": "用视线判断传感器能观察到的区域。",
    "question": "视线被第一堵实墙阻断。仅凭这一束读数，墙后区域应怎样记录？",
    "options": [
      "标记为全部空闲",
      "标记为全部占用",
      "保留为未知"
    ],
    "answer": 2,
    "explain": "这次测量只覆盖到首次命中的位置，遮挡后的区域没有获得观测。",
    "url": "https://atsushisakai.github.io/PythonRobotics/modules/3_mapping/ray_casting_grid_map/ray_casting_grid_map.html",
    "animation": "https://raw.githubusercontent.com/AtsushiSakai/PythonRoboticsGifs/d3e06807afda4e907861b9c28b263f5880daad37/Mapping/raycasting_grid_map/animation.gif"
  },
  {
    "id": "lidar",
    "title": "激光雷达栅格化",
    "group": "mapping",
    "concept": "把角度与距离换算到地图坐标，再写入格子。",
    "question": "激光在正前方 3 米处返回了有效墙面回波，应把哪个位置记作命中？",
    "options": [
      "射线经过的每个位置",
      "被击中墙面的另一侧",
      "射线上距雷达 3 米处"
    ],
    "answer": 2,
    "explain": "角度决定方向，距离决定端点。端点代表此次回波对应的表面位置。",
    "url": "https://atsushisakai.github.io/PythonRobotics/modules/3_mapping/lidar_to_grid_map_tutorial/lidar_to_grid_map_tutorial.html",
    "animation": "https://raw.githubusercontent.com/AtsushiSakai/PythonRoboticsGifs/d3e06807afda4e907861b9c28b263f5880daad37/Mapping/lidar_to_grid_map/animation.gif"
  },
  {
    "id": "rectangle",
    "title": "点云矩形拟合",
    "group": "mapping",
    "concept": "把一组二维回波拟合成带有朝向的矩形轮廓。",
    "question": "两组长条状点云大小相同，一组相对另一组旋转 30°。拟合时必须允许改变什么？",
    "options": [
      "每个点的采样时间",
      "地面的高度",
      "矩形的朝向"
    ],
    "answer": 2,
    "explain": "只允许轴对齐矩形会丢失斜放物体的方向，旋转参数能表达这种差异。",
    "url": "https://atsushisakai.github.io/PythonRobotics/modules/3_mapping/rectangle_fitting/rectangle_fitting.html",
    "animation": "https://raw.githubusercontent.com/AtsushiSakai/PythonRoboticsGifs/d3e06807afda4e907861b9c28b263f5880daad37/Mapping/rectangle_fitting/animation.gif"
  },
  {
    "id": "circle",
    "title": "点云圆形拟合",
    "group": "mapping",
    "concept": "从圆弧上的采样点估计圆心和半径。",
    "question": "候选圆心已经选好。理想的无噪声圆上各点应满足什么条件？",
    "options": [
      "所有横坐标相同",
      "到圆心的距离相同",
      "相邻采样点间隔相同"
    ],
    "answer": 1,
    "explain": "圆由到圆心等距的点构成，采样点无须沿圆周均匀排列。",
    "url": "https://atsushisakai.github.io/PythonRobotics/modules/3_mapping/circle_fitting/circle_fitting.html",
    "animation": "https://raw.githubusercontent.com/AtsushiSakai/PythonRoboticsGifs/d3e06807afda4e907861b9c28b263f5880daad37/Mapping/circle_fitting/animation.gif"
  },
  {
    "id": "icp",
    "title": "ICP 点云配准",
    "group": "slam",
    "concept": "轮流匹配近邻点并估计刚体变换，让两帧扫描逐渐重合。",
    "question": "刚刚把第二帧旋转并平移了一次，进入下一轮前应该做什么？",
    "options": [
      "固定之前的匹配直到结束",
      "按新位置重新配对最近点",
      "独立拉伸每个点"
    ],
    "answer": 1,
    "explain": "变换会改变最近邻关系，重新建立对应能进一步减少配准误差。",
    "url": "https://atsushisakai.github.io/PythonRobotics/modules/4_slam/iterative_closest_point_matching/iterative_closest_point_matching.html",
    "animation": "https://raw.githubusercontent.com/AtsushiSakai/PythonRoboticsGifs/d3e06807afda4e907861b9c28b263f5880daad37/SLAM/iterative_closest_point/animation.gif"
  },
  {
    "id": "fastslam",
    "title": "FastSLAM 1.0",
    "group": "slam",
    "concept": "每个粒子保存一条机器人轨迹假设及对应的地标地图。",
    "question": "两个粒子对机器人轨迹的假设不同，观察到同一地标时应怎样记录？",
    "options": [
      "要求二者共享绝对坐标",
      "只保留地标的颜色",
      "分别更新各自的地标估计"
    ],
    "answer": 2,
    "explain": "地标的世界坐标依赖观测时的位姿，每条轨迹拥有一份条件地图。",
    "url": "https://atsushisakai.github.io/PythonRobotics/modules/4_slam/FastSLAM1/FastSLAM1.html",
    "animation": "https://raw.githubusercontent.com/AtsushiSakai/PythonRoboticsGifs/d3e06807afda4e907861b9c28b263f5880daad37/SLAM/FastSLAM1/animation.gif"
  },
  {
    "id": "fastslam2",
    "title": "FastSLAM 2.0",
    "group": "slam",
    "concept": "将新地标观测纳入位姿采样，减少不符合观测的粒子。",
    "question": "收到质量较高的新地标观测。生成位姿候选时可以利用什么？",
    "options": [
      "只用下一帧的观测",
      "只用起点坐标",
      "运动预测及最新观测"
    ],
    "answer": 2,
    "explain": "观测能收窄与真实位置相符的采样区域，提高候选粒子的有效性。",
    "url": "https://atsushisakai.github.io/PythonRobotics/modules/4_slam/FastSLAM2/FastSLAM2.html",
    "animation": "https://raw.githubusercontent.com/AtsushiSakai/PythonRoboticsGifs/d3e06807afda4e907861b9c28b263f5880daad37/SLAM/FastSLAM2/animation.gif"
  },
  {
    "id": "ekf-slam",
    "title": "EKF SLAM 联合估计",
    "group": "slam",
    "concept": "把车身位姿与多个地标放进一个联合状态。",
    "question": "机器人再次看到了熟悉的地标。为什么机器人的位置估计也可能改变？",
    "options": [
      "地标的真实位置在移动",
      "地标和位姿估计有关联",
      "传感器不再产生噪声"
    ],
    "answer": 1,
    "explain": "联合协方差记录这些量之间的关联，一次地标观测可以修正相关状态。",
    "url": "https://atsushisakai.github.io/PythonRobotics/modules/4_slam/ekf_slam/ekf_slam.html",
    "animation": "https://raw.githubusercontent.com/AtsushiSakai/PythonRoboticsGifs/d3e06807afda4e907861b9c28b263f5880daad37/SLAM/EKFSLAM/animation.gif"
  },
  {
    "id": "graph-slam",
    "title": "图优化 SLAM",
    "group": "slam",
    "concept": "把位姿当作图节点，把相邻运动和重复观测当作约束。",
    "question": "绕一圈后认出出发点，但里程计以为还差两米。加入回环约束会怎样？",
    "options": [
      "联合调整多个位姿分摊误差",
      "删除之前的所有路径",
      "只给终点换一个名字"
    ],
    "answer": 0,
    "explain": "优化器寻找让多条约束整体更一致的位姿组合，历史轨迹也能随之改变。",
    "url": "https://atsushisakai.github.io/PythonRobotics/modules/4_slam/graph_slam/graph_slam.html",
    "animation": "https://raw.githubusercontent.com/AtsushiSakai/PythonRoboticsGifs/d3e06807afda4e907861b9c28b263f5880daad37/SLAM/GraphBasedSLAM/Graph_SLAM_optimization.gif"
  },
  {
    "id": "astar",
    "title": "A* 启发式搜索",
    "group": "planning",
    "concept": "用已经走过的代价 g 加上剩余估计 h 决定搜索次序。",
    "question": "候选甲的 g=4、h=3，乙的 g=2、h=6。A* 下一次优先检查谁？",
    "options": [
      "乙，已走代价更低",
      "甲，总代价为 7",
      "乙，剩余估计更高"
    ],
    "answer": 1,
    "explain": "甲的总分 7 小于乙的 8，因此从候选集合中先取甲。",
    "url": "https://atsushisakai.github.io/PythonRobotics/modules/5_path_planning/grid_base_search/grid_base_search.html",
    "animation": "https://raw.githubusercontent.com/AtsushiSakai/PythonRoboticsGifs/d3e06807afda4e907861b9c28b263f5880daad37/PathPlanning/AStar/animation.gif"
  },
  {
    "id": "dijkstra",
    "title": "Dijkstra 最短路",
    "group": "planning",
    "concept": "在非负边权的图上，按从起点出发的累计代价搜索。",
    "question": "候选甲已走 4 格，乙已走 6 格；乙看起来更靠近终点。下一步先查谁？",
    "options": [
      "乙，终点离它更近",
      "两者按目标方向排序",
      "甲，累计代价较低"
    ],
    "answer": 2,
    "explain": "Dijkstra 的优先级取决于从起点到候选节点的累计代价。",
    "url": "https://atsushisakai.github.io/PythonRobotics/modules/5_path_planning/grid_base_search/grid_base_search.html",
    "animation": "https://raw.githubusercontent.com/AtsushiSakai/PythonRoboticsGifs/d3e06807afda4e907861b9c28b263f5880daad37/PathPlanning/Dijkstra/animation.gif"
  },
  {
    "id": "dstar",
    "title": "D* 动态重规划",
    "group": "planning",
    "concept": "地图代价变化后传播修正，寻找仍可通行的路线。",
    "question": "小车发现前方原本畅通的格子被箱子占据。哪些旧信息还有用？",
    "options": [
      "未受变化影响的路径代价",
      "旧路径上的所有边都仍然可走",
      "箱子后面的路必然也被堵住"
    ],
    "answer": 0,
    "explain": "D* 将改变的代价传播到相关区域，能继续使用未受影响的搜索结果。",
    "url": "https://atsushisakai.github.io/PythonRobotics/modules/5_path_planning/grid_base_search/grid_base_search.html",
    "animation": "https://raw.githubusercontent.com/AtsushiSakai/PythonRoboticsGifs/d3e06807afda4e907861b9c28b263f5880daad37/PathPlanning/DStar/animation.gif"
  },
  {
    "id": "dstar-lite",
    "title": "D* Lite 增量搜索",
    "group": "planning",
    "concept": "比较节点的当前代价与根据邻居得到的一步估计。",
    "question": "某格的 g 与一步估计 rhs 不相等，这在 D* Lite 中意味着什么？",
    "options": [
      "这个格子已经是终点",
      "这个格子永久不可达",
      "该格局部不一致，可能需要更新"
    ],
    "answer": 2,
    "explain": "局部不一致反映图代价或邻居状态的变化，算法用优先队列传播必要的修正。",
    "url": "https://atsushisakai.github.io/PythonRobotics/modules/5_path_planning/grid_base_search/grid_base_search.html",
    "animation": "https://raw.githubusercontent.com/AtsushiSakai/PythonRoboticsGifs/d3e06807afda4e907861b9c28b263f5880daad37/PathPlanning/DStarLite/animation.gif"
  },
  {
    "id": "potential",
    "title": "人工势场",
    "group": "planning",
    "concept": "用目标吸引与障碍排斥构造一个地形，让机器人沿势值下降。",
    "question": "机器人还没到终点，但周边每格的势值都更高。它遇到了什么？",
    "options": [
      "全图最短路",
      "局部极小值",
      "传感器的最大量程"
    ],
    "answer": 1,
    "explain": "单纯向低势值移动时，机器人可能卡在目标之外的盆地里。",
    "url": "https://atsushisakai.github.io/PythonRobotics/modules/5_path_planning/grid_base_search/grid_base_search.html",
    "animation": "https://raw.githubusercontent.com/AtsushiSakai/PythonRoboticsGifs/d3e06807afda4e907861b9c28b263f5880daad37/PathPlanning/PotentialFieldPlanning/animation.gif"
  },
  {
    "id": "sweep",
    "title": "往返扫描覆盖",
    "group": "planning",
    "concept": "以平行扫描带往返移动，覆盖区域内的格子。",
    "question": "清扫车已经到达出口，但中间漏扫一整排。本关完成了吗？",
    "options": [
      "还需要覆盖遗漏区域",
      "只要抵达出口就完成",
      "只需返回出发点"
    ],
    "answer": 0,
    "explain": "覆盖规划的目标含有区域覆盖要求，单纯连通起点和终点不足以完成任务。",
    "url": "https://atsushisakai.github.io/PythonRobotics/modules/5_path_planning/coverage_path/coverage_path.html",
    "animation": "https://raw.githubusercontent.com/AtsushiSakai/PythonRoboticsGifs/d3e06807afda4e907861b9c28b263f5880daad37/PathPlanning/GridBasedSweepCPP/animation.gif"
  },
  {
    "id": "pso",
    "title": "粒子群路径优化",
    "group": "planning",
    "concept": "让一群候选解根据自身历史和群体经验更新搜索方向。",
    "question": "某个候选路线找到低代价的绕行方案。其他粒子可以利用什么信息？",
    "options": [
      "下一次随机数的精确值",
      "群体记录的较优解",
      "真实最短路径的预设答案"
    ],
    "answer": 1,
    "explain": "个体最优与群体最优共同影响更新方向，粒子还保留惯性和随机探索。",
    "url": "https://atsushisakai.github.io/PythonRobotics/modules/5_path_planning/particleSwarmOptimization/particleSwarmOptimization.html",
    "animation": "https://raw.githubusercontent.com/AtsushiSakai/PythonRoboticsGifs/d3e06807afda4e907861b9c28b263f5880daad37/PathPlanning/ParticleSwarmOptimization/animation.gif"
  },
  {
    "id": "dwa",
    "title": "动态窗口避障",
    "group": "planning",
    "concept": "采样近期能达到的线速度和角速度，预测短时间内的轨迹。",
    "question": "哪一个速度指令应在当前周期优先排除？",
    "options": [
      "让小车稍稍减速的指令",
      "超出当前加速度可达范围的指令",
      "使小车转向空旷处的指令"
    ],
    "answer": 1,
    "explain": "动态窗口受速度与加速度限制，可执行的运动只来自当前可达的速度窗口。",
    "url": "https://atsushisakai.github.io/PythonRobotics/modules/5_path_planning/dynamic_window_approach/dynamic_window_approach.html",
    "animation": "https://raw.githubusercontent.com/AtsushiSakai/PythonRoboticsGifs/d3e06807afda4e907861b9c28b263f5880daad37/PathPlanning/DynamicWindowApproach/animation.gif"
  },
  {
    "id": "lattice",
    "title": "状态格轨迹规划",
    "group": "planning",
    "concept": "采样不同末端位姿，尝试用符合车辆模型的轨迹与起点连接。",
    "question": "两个候选终点坐标相同、朝向相差 90°，应如何处理？",
    "options": [
      "直接合成一条直线轨迹",
      "只保留离原点近的一个",
      "作为两个不同的末端状态"
    ],
    "answer": 2,
    "explain": "朝向也是位姿的一部分，抵达同一位置所需的转弯运动可以不同。",
    "url": "https://atsushisakai.github.io/PythonRobotics/modules/5_path_planning/state_lattice_planner/state_lattice_planner.html",
    "animation": "https://raw.githubusercontent.com/AtsushiSakai/PythonRoboticsGifs/d3e06807afda4e907861b9c28b263f5880daad37/PathPlanning/StateLatticePlanner/UniformPolarSampling.gif"
  },
  {
    "id": "polar",
    "title": "目标偏置极坐标采样",
    "group": "planning",
    "concept": "在目标方向附近布置更密集的候选末端位姿。",
    "question": "已知目标位于左前方。引入目标偏置会如何影响候选轨迹？",
    "options": [
      "每条候选轨迹长度相同",
      "更多候选朝向左前方",
      "候选全部固定在右前方"
    ],
    "answer": 1,
    "explain": "偏置改变方向的采样密度，提高探索目标附近可行运动的机会。",
    "url": "https://atsushisakai.github.io/PythonRobotics/modules/5_path_planning/state_lattice_planner/state_lattice_planner.html",
    "animation": "https://raw.githubusercontent.com/AtsushiSakai/PythonRoboticsGifs/d3e06807afda4e907861b9c28b263f5880daad37/PathPlanning/StateLatticePlanner/BiasedPolarSampling.gif"
  },
  {
    "id": "lane",
    "title": "车道末端采样",
    "group": "planning",
    "concept": "在车道横向范围内布置候选终点，生成可行驶的曲线。",
    "question": "要表现同一车道中靠左和靠右的两条候选轨迹，应改变什么？",
    "options": [
      "车道的统一限速",
      "地图原点的名字",
      "终点相对车道中心的横向位置"
    ],
    "answer": 2,
    "explain": "横向采样可以覆盖车道内多个位置，为车辆提供几条可比较的候选轨迹。",
    "url": "https://atsushisakai.github.io/PythonRobotics/modules/5_path_planning/state_lattice_planner/state_lattice_planner.html",
    "animation": "https://raw.githubusercontent.com/AtsushiSakai/PythonRoboticsGifs/d3e06807afda4e907861b9c28b263f5880daad37/PathPlanning/StateLatticePlanner/LaneSampling.gif"
  },
  {
    "id": "prm",
    "title": "PRM 概率路网",
    "group": "planning",
    "concept": "先采样空闲位置并建立可通行边，再在路网上找路。",
    "question": "两个采样点都在空地，可它们中间有一堵墙。能直接连边吗？",
    "options": [
      "需要检查整条局部连接是否碰撞",
      "只要端点空闲就可以",
      "只要距离短就可以"
    ],
    "answer": 0,
    "explain": "路网中的每条边也必须可行，只检查端点可能生成穿墙捷径。",
    "url": "https://atsushisakai.github.io/PythonRobotics/modules/5_path_planning/prm_planner/prm_planner.html",
    "animation": "https://raw.githubusercontent.com/AtsushiSakai/PythonRoboticsGifs/d3e06807afda4e907861b9c28b263f5880daad37/PathPlanning/ProbabilisticRoadMap/animation.gif"
  },
  {
    "id": "rrt",
    "title": "快速探索随机树",
    "group": "planning",
    "concept": "在随机样点方向上，从已有树的近邻尝试延伸一小段。",
    "question": "从最近节点向样点延伸的新线段穿过障碍物，应怎么办？",
    "options": [
      "把障碍物移到样点后方",
      "拒绝这次碰撞扩展",
      "仍将这条线段加入路径"
    ],
    "answer": 1,
    "explain": "新增树枝也要通过碰撞检测，失败后可以进行下一次采样。",
    "url": "https://atsushisakai.github.io/PythonRobotics/modules/5_path_planning/rrt/rrt.html",
    "animation": "https://raw.githubusercontent.com/AtsushiSakai/PythonRoboticsGifs/d3e06807afda4e907861b9c28b263f5880daad37/PathPlanning/RRT/animation.gif"
  },
  {
    "id": "rrt-star",
    "title": "RRT* 邻域重连",
    "group": "planning",
    "concept": "增加新节点后，尝试以更低代价连接附近的节点。",
    "question": "通过新节点可更短地到达旧节点，且新连接无碰撞。应做什么？",
    "options": [
      "考虑把旧节点重新连接到新节点",
      "立即停止所有采样",
      "把所有树枝同时拉直"
    ],
    "answer": 0,
    "explain": "重连允许树持续改善已有路线的代价。",
    "url": "https://atsushisakai.github.io/PythonRobotics/modules/5_path_planning/rrt/rrt.html",
    "animation": "https://raw.githubusercontent.com/AtsushiSakai/PythonRoboticsGifs/d3e06807afda4e907861b9c28b263f5880daad37/PathPlanning/RRTstar/animation.gif"
  },
  {
    "id": "rrt-reeds",
    "title": "RRT* 与 Reeds–Shepp",
    "group": "planning",
    "concept": "用可前进、可倒车且曲率受限的连接段来扩展树。",
    "question": "这棵树为什么适合模拟小车泊入狭窄车位？",
    "options": [
      "连接可包含前进与倒车",
      "允许车身在原地侧移",
      "允许任意半径急转"
    ],
    "answer": 0,
    "explain": "Reeds–Shepp 段为可倒车的转向车辆提供符合最小转弯半径的局部连接。",
    "url": "https://atsushisakai.github.io/PythonRobotics/modules/5_path_planning/rrt/rrt.html",
    "animation": "https://raw.githubusercontent.com/AtsushiSakai/PythonRoboticsGifs/d3e06807afda4e907861b9c28b263f5880daad37/PathPlanning/RRTStarReedsShepp/animation.gif"
  },
  {
    "id": "lqr-rrt",
    "title": "LQR-RRT* 采样规划",
    "group": "planning",
    "concept": "用局部反馈控制器连接树上的运动状态。",
    "question": "两个候选状态位置相同但速度不同。对双积分器模型，连接是否相同？",
    "options": [
      "可能不同，速度也是状态",
      "相同，只看平面距离",
      "必定无法连接"
    ],
    "answer": 0,
    "explain": "双积分器由加速度驱动，速度差异会改变抵达目标状态所需的控制。",
    "url": "https://atsushisakai.github.io/PythonRobotics/modules/5_path_planning/rrt/rrt.html",
    "animation": "https://raw.githubusercontent.com/AtsushiSakai/PythonRoboticsGifs/d3e06807afda4e907861b9c28b263f5880daad37/PathPlanning/LQRRRTStar/animation.gif"
  },
  {
    "id": "quintic",
    "title": "五次多项式轨迹",
    "group": "planning",
    "concept": "为每个坐标建立曲线，同时满足起终点的运动条件。",
    "question": "给定非零行程时间，一条标量五次曲线可满足哪组六个边界条件？",
    "options": [
      "起终点各自的位置、速度、加速度",
      "任意七个独立的位置条件",
      "任意时刻都具有相同速度"
    ],
    "answer": 0,
    "explain": "六个系数可用于满足两个端点的六个独立条件。",
    "url": "https://atsushisakai.github.io/PythonRobotics/modules/5_path_planning/quintic_polynomials_planner/quintic_polynomials_planner.html",
    "animation": "https://raw.githubusercontent.com/AtsushiSakai/PythonRoboticsGifs/d3e06807afda4e907861b9c28b263f5880daad37/PathPlanning/QuinticPolynomialsPlanner/animation.gif"
  },
  {
    "id": "reeds",
    "title": "Reeds–Shepp 泊车曲线",
    "group": "planning",
    "concept": "将直线和圆弧拼成可前进、可倒车的车形路径。",
    "question": "一条候选路径先向前，随后沿原朝向倒退。换向处最明显的变化是什么？",
    "options": [
      "车身必须瞬移半圈",
      "行驶方向切换",
      "最小转弯半径变为零"
    ],
    "answer": 1,
    "explain": "路径允许前进和倒车，换向点改变运动方向，同时位置保持连续。",
    "url": "https://atsushisakai.github.io/PythonRobotics/modules/5_path_planning/reeds_shepp_path/reeds_shepp_path.html",
    "animation": "https://raw.githubusercontent.com/AtsushiSakai/PythonRoboticsGifs/d3e06807afda4e907861b9c28b263f5880daad37/PathPlanning/ReedsSheppPath/animation.gif"
  },
  {
    "id": "lqr-plan",
    "title": "LQR 局部路径规划",
    "group": "planning",
    "concept": "权衡状态误差与控制代价，用反馈把双积分器带向目标。",
    "question": "其他设置相同，增大控制消耗的权重 R，优化会更在意什么？",
    "options": [
      "完全消除所有跟踪误差",
      "忽略运动模型",
      "避免过大的控制输入"
    ],
    "answer": 2,
    "explain": "较大的 R 让同样大小的输入付出更高代价。",
    "url": "https://atsushisakai.github.io/PythonRobotics/modules/5_path_planning/lqr_path/lqr_path.html",
    "animation": "https://raw.githubusercontent.com/AtsushiSakai/PythonRoboticsGifs/d3e06807afda4e907861b9c28b263f5880daad37/PathPlanning/LQRPlanner/animation.gif"
  },
  {
    "id": "frenet",
    "title": "Frenet 坐标轨迹",
    "group": "planning",
    "concept": "用沿参考线的 s 与横向偏移 d 描述行驶轨迹。",
    "question": "小车沿直路保持同一进度，由车道中心向侧面平移。哪个量直接改变？",
    "options": [
      "沿路进度 s",
      "参考线总长度",
      "横向偏移 d"
    ],
    "answer": 2,
    "explain": "d 记录到参考线的带符号横向距离，适合描述横向偏移。",
    "url": "https://atsushisakai.github.io/PythonRobotics/modules/5_path_planning/frenet_frame_path/frenet_frame_path.html",
    "animation": "https://raw.githubusercontent.com/AtsushiSakai/PythonRoboticsGifs/d3e06807afda4e907861b9c28b263f5880daad37/PathPlanning/FrenetOptimalTrajectory/animation.gif"
  },
  {
    "id": "dubins",
    "title": "Dubins 前进曲线",
    "group": "planning",
    "concept": "只准前进的转向车用直线和有限半径圆弧连接两个位姿。",
    "question": "下面哪一段违反了 Dubins 车的基本假设？",
    "options": [
      "向前走半径合规的左弧",
      "后退一小段直线",
      "向前直行"
    ],
    "answer": 1,
    "explain": "Dubins 模型只允许向前，倒车需要换用支持双向运动的模型。",
    "url": "https://atsushisakai.github.io/PythonRobotics/modules/5_path_planning/dubins_path/dubins_path.html",
    "animation": "https://raw.githubusercontent.com/AtsushiSakai/PythonRoboticsGifs/d3e06807afda4e907861b9c28b263f5880daad37/PathPlanning/DubinsPath/animation.gif"
  },
  {
    "id": "hybrid",
    "title": "混合 A*",
    "group": "planning",
    "concept": "结合离散搜索与连续车辆运动来规划可转向的路线。",
    "question": "车头朝北和车头朝东的车辆处在同一格，它们的下一段可行轨迹怎样？",
    "options": [
      "必然相同，只看格子位置",
      "都只能向正北行驶",
      "可能不同，朝向影响扩展"
    ],
    "answer": 2,
    "explain": "混合 A* 在扩展时考虑朝向和运动学约束，能避免许多车开不出来的路径。",
    "url": "https://atsushisakai.github.io/PythonRobotics/modules/5_path_planning/hybridastar/hybridastar.html",
    "animation": "https://raw.githubusercontent.com/AtsushiSakai/PythonRoboticsGifs/d3e06807afda4e907861b9c28b263f5880daad37/PathPlanning/HybridAStar/animation.gif"
  },
  {
    "id": "bug",
    "title": "贴墙绕障 Bug",
    "group": "planning",
    "concept": "结合朝目标移动与沿障碍边界移动两种行为。",
    "question": "朝目标直行时遇到挡路的长墙，Bug 类算法接下来通常怎样探索？",
    "options": [
      "沿障碍边界寻找可离开的位置",
      "把终点改为墙的中心",
      "在墙前永久停车"
    ],
    "answer": 0,
    "explain": "边界跟随使机器人能绕到障碍侧面，再依据离开条件恢复朝目标运动。",
    "url": "https://atsushisakai.github.io/PythonRobotics/modules/5_path_planning/bugplanner/bugplanner.html",
    "animation": "https://raw.githubusercontent.com/AtsushiSakai/PythonRoboticsGifs/d3e06807afda4e907861b9c28b263f5880daad37/PathPlanning/BugPlanner/animation.gif"
  },
  {
    "id": "visibility",
    "title": "可见性路网",
    "group": "planning",
    "concept": "在障碍物顶点附近构建图，连接彼此无遮挡的候选点。",
    "question": "两点间的直线穿过多边形障碍内部。这条可见性边是否成立？",
    "options": [
      "成立，只看顶点的颜色",
      "成立，只要两端够远",
      "不成立，中间存在遮挡"
    ],
    "answer": 2,
    "explain": "可见性边要求点之间的直线连接可通行。",
    "url": "https://atsushisakai.github.io/PythonRobotics/modules/5_path_planning/visibility_road_map_planner/visibility_road_map_planner.html",
    "animation": "https://raw.githubusercontent.com/AtsushiSakai/PythonRoboticsGifs/d3e06807afda4e907861b9c28b263f5880daad37/PathPlanning/VisibilityRoadMap/animation.gif"
  },
  {
    "id": "voronoi",
    "title": "Voronoi 路网",
    "group": "planning",
    "concept": "在多个障碍物之间构建具有间隙的通行骨架。",
    "question": "在两条平行墙之间，哪条线到两侧墙的距离相等？",
    "options": [
      "任意一侧墙面",
      "与墙垂直的任意直线",
      "走廊中线"
    ],
    "answer": 2,
    "explain": "Voronoi 边界是到相邻生成元等距的位置，常给路线留下较大的障碍间隙。",
    "url": "https://atsushisakai.github.io/PythonRobotics/modules/5_path_planning/vrm_planner/vrm_planner.html",
    "animation": "https://raw.githubusercontent.com/AtsushiSakai/PythonRoboticsGifs/d3e06807afda4e907861b9c28b263f5880daad37/PathPlanning/VoronoiRoadMap/animation.gif"
  },
  {
    "id": "breadth",
    "title": "广度优先搜索 BFS",
    "group": "planning",
    "concept": "在等权步长的网格上，按经过的步数逐层推进。",
    "question": "从起点开始，每一步代价都为 1。正处理距离为 2 的节点，哪一层会先于第 4 层被取出？",
    "options": [
      "第 5 层",
      "第 3 层",
      "第 8 层"
    ],
    "answer": 1,
    "explain": "先进先出队列让广度搜索按步数从近到远展开。",
    "url": "https://atsushisakai.github.io/PythonRobotics/modules/5_path_planning/grid_base_search/grid_base_search.html",
    "animation": "https://raw.githubusercontent.com/AtsushiSakai/PythonRoboticsGifs/d3e06807afda4e907861b9c28b263f5880daad37/PathPlanning/BreadthFirstSearch/animation.gif"
  },
  {
    "id": "depth",
    "title": "深度优先搜索 DFS",
    "group": "planning",
    "concept": "沿一个分支尽可能深入，遇到死端再回溯。",
    "question": "当前节点已经没有未访问的邻居，应怎样继续？",
    "options": [
      "退回仍有未访问分支的节点",
      "宣布整张地图都不可达",
      "直接跳到终点"
    ],
    "answer": 0,
    "explain": "回溯允许搜索探索先前留下的分支，首次找到的路径未必最短。",
    "url": "https://atsushisakai.github.io/PythonRobotics/modules/5_path_planning/grid_base_search/grid_base_search.html",
    "animation": "https://raw.githubusercontent.com/AtsushiSakai/PythonRoboticsGifs/d3e06807afda4e907861b9c28b263f5880daad37/PathPlanning/DepthFirstSearch/animation.gif"
  },
  {
    "id": "pose",
    "title": "目标位姿控制",
    "group": "tracking",
    "concept": "控制目标同时包含平面位置和末端朝向。",
    "question": "两车停在同一泊车点，一辆车头朝东，另一辆朝西。它们的位姿相同吗？",
    "options": [
      "不同，朝向是位姿的一部分",
      "相同，只要位置一样",
      "只看它们上一步的速度"
    ],
    "answer": 0,
    "explain": "二维位姿通常由 x、y 和朝向三个量组成。",
    "url": "https://atsushisakai.github.io/PythonRobotics/modules/6_path_tracking/move_to_a_pose/move_to_a_pose.html",
    "animation": "https://raw.githubusercontent.com/AtsushiSakai/PythonRoboticsGifs/d3e06807afda4e907861b9c28b263f5880daad37/Control/move_to_pose/animation.gif"
  },
  {
    "id": "stanley",
    "title": "Stanley 横向控制",
    "group": "tracking",
    "concept": "结合航向误差和前轴的横向偏差产生转向修正。",
    "question": "车头已和一条直线道路平行，但前轴仍偏在道路一侧。控制器应该怎样做？",
    "options": [
      "利用横向误差继续纠偏",
      "认为误差已经为零",
      "只根据剩余路程转向"
    ],
    "answer": 0,
    "explain": "朝向对齐并不保证车辆位于中心线上，横向误差项能让它逐渐回线。",
    "url": "https://atsushisakai.github.io/PythonRobotics/modules/6_path_tracking/stanley_control/stanley_control.html",
    "animation": "https://raw.githubusercontent.com/AtsushiSakai/PythonRoboticsGifs/d3e06807afda4e907861b9c28b263f5880daad37/PathTracking/stanley_controller/animation.gif"
  },
  {
    "id": "rear-feedback",
    "title": "后轮反馈跟踪",
    "group": "tracking",
    "concept": "以后轴附近的路径偏差和航向误差作为反馈量。",
    "question": "需要测量这个控制器的横向偏差时，选哪个参照点最合适？",
    "options": [
      "道路终点",
      "前方任意一个障碍点",
      "后轴中心附近"
    ],
    "answer": 2,
    "explain": "控制律以车辆后轴位置相对参考路径的误差来修正运动。",
    "url": "https://atsushisakai.github.io/PythonRobotics/modules/6_path_tracking/rear_wheel_feedback_control/rear_wheel_feedback_control.html",
    "animation": "https://raw.githubusercontent.com/AtsushiSakai/PythonRoboticsGifs/d3e06807afda4e907861b9c28b263f5880daad37/PathTracking/rear_wheel_feedback/animation.gif"
  },
  {
    "id": "lqr-track",
    "title": "LQR 速度与转向",
    "group": "tracking",
    "concept": "在统一的二次代价里处理速度与横向跟踪误差。",
    "question": "小车偏离中心线且低于参考速度。联合控制器可同时输出什么？",
    "options": [
      "转向修正与纵向加速度",
      "两个新的道路终点",
      "新的地图和地标编号"
    ],
    "answer": 0,
    "explain": "转向影响横向运动，加速度影响纵向速度，联合控制可同时调整二者。",
    "url": "https://atsushisakai.github.io/PythonRobotics/modules/6_path_tracking/lqr_speed_and_steering_control/lqr_speed_and_steering_control.html",
    "animation": "https://raw.githubusercontent.com/AtsushiSakai/PythonRoboticsGifs/d3e06807afda4e907861b9c28b263f5880daad37/PathTracking/lqr_speed_steer_control/animation.gif"
  },
  {
    "id": "mpc",
    "title": "滚动时域 MPC",
    "group": "tracking",
    "concept": "预测未来一段时间的运动，优化一串控制指令。",
    "question": "求出接下来五步控制后，标准滚动时域控制先执行几步再用新状态重算？",
    "options": [
      "无条件执行全部五步",
      "只执行最后一步",
      "先执行第一步"
    ],
    "answer": 2,
    "explain": "每轮用最新观测重新优化，因而可以持续修正预测与实际运动之间的偏差。",
    "url": "https://atsushisakai.github.io/PythonRobotics/modules/6_path_tracking/model_predictive_speed_and_steering_control/model_predictive_speed_and_steering_control.html",
    "animation": "https://raw.githubusercontent.com/AtsushiSakai/PythonRoboticsGifs/d3e06807afda4e907861b9c28b263f5880daad37/PathTracking/model_predictive_speed_and_steer_control/animation.gif"
  },
  {
    "id": "nmpc",
    "title": "C-GMRES 非线性 MPC",
    "group": "tracking",
    "concept": "在相邻时刻连续更新非线性最优控制解。",
    "question": "为什么上一时刻的控制解能帮助下一次求解？",
    "options": [
      "机器人之后永远走直线",
      "所有未来扰动都已知",
      "相邻时刻的问题往往相近"
    ],
    "answer": 2,
    "explain": "延续法可沿随时间变化的最优条件更新解，GMRES 用于相关线性方程的迭代求解。",
    "url": "https://atsushisakai.github.io/PythonRobotics/modules/6_path_tracking/cgmres_nmpc/cgmres_nmpc.html",
    "animation": "https://raw.githubusercontent.com/AtsushiSakai/PythonRoboticsGifs/d3e06807afda4e907861b9c28b263f5880daad37/PathTracking/cgmres_nmpc/animation.gif"
  },
  {
    "id": "pursuit",
    "title": "纯跟踪 Pure Pursuit",
    "group": "tracking",
    "concept": "选取参考路径上前方的一个预瞄点并朝它转向。",
    "question": "同一条路上增大预瞄距离，一般会先改变什么？",
    "options": [
      "选中的前方目标点更远",
      "车辆的真实轴距变长",
      "路线起点立即改变"
    ],
    "answer": 0,
    "explain": "预瞄距离直接决定追踪目标的位置，进而影响控制器给出的曲率。",
    "url": "https://atsushisakai.github.io/PythonRobotics/modules/6_path_tracking/pure_pursuit_tracking/pure_pursuit_tracking.html",
    "animation": "https://raw.githubusercontent.com/AtsushiSakai/PythonRoboticsGifs/d3e06807afda4e907861b9c28b263f5880daad37/PathTracking/pure_pursuit/animation.gif"
  },
  {
    "id": "lqr-steer",
    "title": "LQR 转向控制",
    "group": "tracking",
    "concept": "将偏离路径的状态作为反馈计算转向校正。",
    "question": "两车横向偏差一致，但一辆正偏得更远。反馈应考虑哪个附加量？",
    "options": [
      "偏差变化率或航向状态",
      "只看车漆颜色",
      "只看整条路径的长度"
    ],
    "answer": 0,
    "explain": "动态状态能区分正在回线与正在远离路径，所需校正强度可能不同。",
    "url": "https://atsushisakai.github.io/PythonRobotics/modules/6_path_tracking/lqr_steering_control/lqr_steering_control.html",
    "animation": "https://raw.githubusercontent.com/AtsushiSakai/PythonRoboticsGifs/d3e06807afda4e907861b9c28b263f5880daad37/PathTracking/lqr_steer_control/animation.gif"
  },
  {
    "id": "arm-ik",
    "title": "双关节机械臂逆解",
    "group": "arm",
    "concept": "根据夹爪的目标位置反求两个转动关节的角度。",
    "question": "两段机械臂各长 1 米，基座固定。要够到距基座 2.2 米的按钮可行吗？",
    "options": [
      "可以，只要肘关节转得更快",
      "可以，换一个肘部方向即可",
      "不可行，完全伸直也仅有 2 米"
    ],
    "answer": 2,
    "explain": "两段连杆的长度和给出最大伸展距离，更换角度无法超过这条边界。",
    "url": "https://atsushisakai.github.io/PythonRobotics/modules/7_arm_navigation/planar_two_link_ik.html",
    "animation": "https://raw.githubusercontent.com/AtsushiSakai/PythonRoboticsGifs/d3e06807afda4e907861b9c28b263f5880daad37/ArmNavigation/two_joint_arm_to_point_control/animation.gif"
  },
  {
    "id": "n-arm",
    "title": "多关节末端控制",
    "group": "arm",
    "concept": "利用各关节转动对末端位置的影响，小步修正末端误差。",
    "question": "有十个可转动关节，只指定平面上的夹爪位置。一般会出现什么情况？",
    "options": [
      "多个姿势可能到达同一位置",
      "夹爪对每个位置只有一种姿势",
      "末端必定只能沿直线移动"
    ],
    "answer": 0,
    "explain": "关节自由度多于目标坐标维度时，机械臂常有冗余自由度。",
    "url": "https://atsushisakai.github.io/PythonRobotics/modules/7_arm_navigation/n_joint_arm_to_point_control.html",
    "animation": "https://raw.githubusercontent.com/AtsushiSakai/PythonRoboticsGifs/d3e06807afda4e907861b9c28b263f5880daad37/ArmNavigation/n_joint_arm_to_point_control/animation.gif"
  },
  {
    "id": "arm-obstacles",
    "title": "机械臂整臂避障",
    "group": "arm",
    "concept": "在关节角度构成的空间中寻找整条机械臂可通过的运动。",
    "question": "夹爪躲开了桌角，但中间一节连杆会碰到桌角。这一步能接受吗？",
    "options": [
      "可以，只检查夹爪就够了",
      "只需把目标点移高一格",
      "不能，连杆也要通过碰撞检查"
    ],
    "answer": 2,
    "explain": "有效构型要求整条机械臂都与障碍保持分离，运动过程也需要检查。",
    "url": "https://atsushisakai.github.io/PythonRobotics/modules/7_arm_navigation/obstacle_avoidance_arm_navigation.html",
    "animation": "https://raw.githubusercontent.com/AtsushiSakai/PythonRoboticsGifs/d3e06807afda4e907861b9c28b263f5880daad37/ArmNavigation/arm_obstacle_navigation/animation.gif"
  },
  {
    "id": "drone",
    "title": "四旋翼三维轨迹跟踪",
    "group": "aerial",
    "concept": "在三维空间追踪随时间变化的参考位置。",
    "question": "四旋翼的俯视投影始终贴着路线，高度却持续偏低。三维跟踪误差如何？",
    "options": [
      "仍存在竖直方向的误差",
      "已经完全为零",
      "只剩一个时间单位误差"
    ],
    "answer": 0,
    "explain": "俯视图只呈现平面分量，高度差仍会贡献三维位置误差。",
    "url": "https://atsushisakai.github.io/PythonRobotics/modules/8_aerial_navigation/drone_3d_trajectory_following/drone_3d_trajectory_following.html",
    "animation": "https://raw.githubusercontent.com/AtsushiSakai/PythonRoboticsGifs/d3e06807afda4e907861b9c28b263f5880daad37/AerialNavigation/drone_3d_trajectory_following/animation.gif"
  },
  {
    "id": "landing",
    "title": "着陆器软着陆",
    "group": "aerial",
    "concept": "用轨迹约束描述着陆器到达落点时希望处于的状态。",
    "question": "两条仿真轨迹抵达同一落点，一条低速接地，另一条高速接地。软着陆还应检查什么？",
    "options": [
      "接地时的速度",
      "地图的横纵比",
      "历史轨迹点的数量"
    ],
    "answer": 0,
    "explain": "终端位置只说明落在哪里，接地速度影响是否实现平稳着陆。",
    "url": "https://atsushisakai.github.io/PythonRobotics/modules/8_aerial_navigation/rocket_powered_landing/rocket_powered_landing.html",
    "animation": "https://raw.githubusercontent.com/AtsushiSakai/PythonRoboticsGifs/d3e06807afda4e907861b9c28b263f5880daad37/AerialNavigation/rocket_powered_landing/animation.gif"
  },
  {
    "id": "biped",
    "title": "倒立摆双足步态",
    "group": "biped",
    "concept": "用简化的质心运动预估下一次落脚位置。",
    "question": "两次迈步时质心位置相同，一次向前速度更大。下一脚是否仍应固定在同一处？",
    "options": [
      "可能要调整，速度会改变接下来的质心运动",
      "必须相同，只由当前位置决定",
      "直接忽略支撑脚的位置"
    ],
    "answer": 0,
    "explain": "规划落脚点时需要看质心的位置和速度，才能在后续支撑阶段维持预期步态。",
    "url": "https://atsushisakai.github.io/PythonRobotics/modules/9_bipedal/bipedal_planner/bipedal_planner.html",
    "animation": "https://raw.githubusercontent.com/AtsushiSakai/PythonRoboticsGifs/d3e06807afda4e907861b9c28b263f5880daad37/Bipedal/bipedal_planner/animation.gif"
  }
];
