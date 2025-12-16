export enum RcpClient {
  USER_SERVICE = 'USER_SERVICE_CLIENT',
  COURSE_SERVICE = 'COURSE_SERVICE_CLIENT',
  BOOKING_SERVICE = 'BOOKING_SERVICE_CLIENT',
  NOTIFICATION_SERVICE = 'NOTIFICATION_SERVICE_PUBLISHER',
}

export enum BookingMsgPatterns {
  GAME_findGameDetailsByGameId = 'GAME_findGameDetailsByGameId',
  GAME_editGameBaseInfo = 'GAME_editGameBaseInfo',
  GAME_editGameStatus = 'GAME_editGameStatus',
  GAME_findGameWinningRulesByGameId = 'GAME_findGameWinningRulesByGameId',
  GAME_saveGameWinningRules = 'GAME_saveGameWinningRules',
  GAME_findRoundById = 'GAME_findRoundById',
  GAME_findRoundByGameIdAndTurnNumber = 'GAME_findRoundByGameIdAndTurnNumber',
  GAME_findRoundByActive = 'GAME_findRoundByActive',
  GAME_findRoundSummaryByGameIdAndTurnNumber = 'GAME_findRoundSummaryByGameIdAndTurnNumber',
  GAME_findRoundSummaryByActive = 'GAME_findRoundSummaryByActive',
  GAME_findRoundSummaryPagination = 'GAME_findRoundSummaryPagination',
  GAME_divideRoundByCycleCode = 'GAME_divideRoundByCycleCode',
  GAME_findWinningNumberByRoundId = 'GAME_findWinningNumberByRoundId',
  GAME_createWinningNumber = 'GAME_createWinningNumber',
  GAME_forcedBatchJob = 'GAME_forcedBatchJob',
  GAME_resetRoundByCycleCode = 'GAME_resetRoundByCycleCode',
}
