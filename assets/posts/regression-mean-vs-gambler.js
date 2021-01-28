const NUM_COINS = 1000;
const RUN_LENGTH = 4;

function last(a) {
  return a[a.length - 1];
}

function flip_coin() {
  return Math.random() * 2 > 1 ? 'H' : 'T';
}

function generate_coins(num_coins) {
   return Array(num_coins).fill(0).map(_ => flip_coin());
}

function sum_back(val, arr, lift) {
  const prev = last(arr);
  if (prev == null || prev.side !== val) {
    return 1;
  }

  return prev.run + 1;
}

function find_runs(coins) {
  return coins.reduceRight(
    (accumulator, coin) => {
      accumulator.push({
        side: coin,
        run: sum_back(coin, accumulator),
      });
      return accumulator;
    },
    [],
  ).reverse();
}

function render_runs(coins) {
  const ret = [];
  for (let i = 0; i < coins.length;) {
    const coin = coins[i];
    if (coin.run >= RUN_LENGTH) {
      render_run(
        coin.run,
        coins,
        i,
        ret,
      );
      i += coin.run;
    } else {
      ret.push(render_coin(coin));
      ++i;
    }
  }

  return ret.join('');
}

function render_run(length, coins, offset, ret) {
  ret = ret || [];
  for (let i = offset; i < offset + length; ++i) {
    const coin = coins[i];
    ret.push(render_coin(coin, ['run']));
  }

  return ret;
}

function render_coin(coin, classes = []) {
  if (!coin) {
    return '';
  }
  return `<span class="side-${coin.side} coin ${classes.join('')}"></span>`;
}

function extract_runs(coins) {
  const ret = [];
  for (let i = 0; i < coins.length;) {
    const coin = coins[i];
    if (coin.run < RUN_LENGTH) {
      ++i;
      continue;
    }

    ret.push(i);
    i += RUN_LENGTH;
  }

  return ret;
}

function build_run_list(coins, runs) {
  return runs.map(
    r => ({
      offset: r,
      len: RUN_LENGTH,
      next_coin: coins[r + RUN_LENGTH],
      next_coins: Array(RUN_LENGTH).fill(0).map(
        (_, i) => coins[r + RUN_LENGTH + i],
      ).filter(c => !!c),
      type: coins[r].side,
    }),
  );
}

const sum_coins = (acc, c) => acc + (c.side === 'H' ? -1 : 1);

function render_run_list(coins, run_list) {
  return run_list.map(
    r => `
      <tr>
        <td>${render_run(RUN_LENGTH, coins, r.offset).join('')}</td>
        <td>${render_coin(r.next_coin)}</td>
        <td>${r.next_coins.map(c => render_coin(c)).join('')}</td>
        <td>${r.next_coins.reduce(sum_coins, 0)}</td>
      </tr>
    `,
  ).join('');
}

function bindit(exported_data) {
  const to_bind = document.querySelectorAll('[data-bind]');
  for (e of to_bind) {
    const x = e.dataset.bind;
    e.innerHTML = exported_data[x];
  }
}

const coins = find_runs(generate_coins(NUM_COINS));
const runs = extract_runs(coins);
const run_list = build_run_list(coins, runs);

const exported_data = {
  num_coins: NUM_COINS.toLocaleString(),
  coin_chart: coins.map(
    coin => render_coin(coin),
  ).join(''),
  run_chart: render_runs(coins),
  run_length: RUN_LENGTH,
  run_list: render_run_list(
    coins,
    run_list,
  ),
  after_run_heads: runs.reduce(
    (acc, r) => acc + (coins[r + RUN_LENGTH] && coins[r + RUN_LENGTH].side === 'H' ? 1 : 0),
    0
  ),
  after_run_tails: runs.reduce(
    (acc, r) => acc + (coins[r + RUN_LENGTH] && coins[r + RUN_LENGTH].side === 'T' ? 1 : 0),
    0
  ),
  num_runs: runs.length,

  seq_after_run_heads: run_list.reduce(
    (acc, r) =>
      acc + r.next_coins.reduce(
        (acc, c) => acc + (c.side === 'H' ? 1 : 0),
        0,
      ),
    0,
  ),
  seq_after_run_tails: run_list.reduce(
    (acc, r) =>
      acc + r.next_coins.reduce(
        (acc, c) => acc + (c.side === 'T' ? 1 : 0),
        0,
      ),
    0,
  ),
  num_seq_closer_to_mean: run_list.reduce(
    (acc, r) =>
      acc + (Math.abs(r.next_coins.reduce(sum_coins, 0)) < RUN_LENGTH ? 1 : 0),
    0,
  ),

  heads_num_runs: run_list.reduce(
    (acc, r) =>
      acc + (r.type === 'H' ? 1 : 0),
      0,
  ),
  heads_after_run_heads: 0,
  heads_after_run_tails: 0,
};
bindit(exported_data);
