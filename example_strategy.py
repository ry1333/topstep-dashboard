"""Example strategy template for the backtester.

To use:
  1. Copy this file, rename the class to whatever you like.
  2. Implement your signal logic in on_bar().
  3. Upload via the Backtester page; set "Class name" to match yours.

Notes:
  - Use ABSOLUTE imports (`from backtester.engine import ...`).
  - Do NOT call any broker / API code here. Just emit Order objects; the
    engine simulates fills against historical trade tape and enforces risk.
  - Strategy is single-position-at-a-time in v1 (return None while in a position).
"""
from backtester.engine import Context, Order, OrderType, Side
from backtester.strategy import Strategy


class EmaCrossLong(Strategy):
    """Long-only EMA cross during RTH. 8-tick stop / 16-tick target."""
    name = "ema_cross_long"

    def __init__(self, ema_len: int = 20, stop_ticks: int = 8, target_ticks: int = 16):
        self.ema_len = ema_len
        self.stop_ticks = stop_ticks
        self.target_ticks = target_ticks

    def on_bar(self, ctx: Context):
        if ctx.position is not None:
            return None  # bracket handles exits

        # RTH only (CME RTH: 13:30 UTC - 20:00 UTC)
        h = ctx.now.hour
        if h < 14 or h >= 20:
            return None

        bars = ctx.bars
        if len(bars) < self.ema_len + 2:
            return None

        ema = bars["close"].ewm(span=self.ema_len, adjust=False).mean()
        prev_close = bars["close"].iloc[-2]
        prev_ema = ema.iloc[-2]
        cur_close = bars["close"].iloc[-1]
        cur_ema = ema.iloc[-1]

        if prev_close <= prev_ema and cur_close > cur_ema:
            tick = ctx.contract.tick_size
            return [Order(
                side=Side.BUY, qty=1, type=OrderType.MARKET,
                stop_loss=cur_close - self.stop_ticks * tick,
                take_profit=cur_close + self.target_ticks * tick,
                tag="ema_cross",
            )]
        return None
