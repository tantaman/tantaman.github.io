function wrapper() {
  const NUM_COINS = 1000;
  const RUN_LENGTH = 4;

  function last(a) {
    return a[a.length - 1];
  }

  function flip_coin() {
    return Math.random() * 2 > 1 ? 'H' : 'T';
  }

  function generate_coins(num_coins) {
    return Array(num_coins)
      .fill(0)
      .map((_) => flip_coin());
  }

  function sum_back(val, arr, lift) {
    const prev = last(arr);
    if (prev == null || prev.side !== val) {
      return 1;
    }

    return prev.run + 1;
  }

  function find_runs(coins) {
    return coins
      .reduceRight((accumulator, coin) => {
        accumulator.push({
          side: coin,
          run: sum_back(coin, accumulator),
        });
        return accumulator;
      }, [])
      .reverse();
  }

  function render_runs(coins) {
    const ret = [];
    for (let i = 0; i < coins.length; ) {
      const coin = coins[i];
      if (coin.run >= RUN_LENGTH) {
        render_run(coin.run, coins, i, ret);
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
    for (let i = 0; i < coins.length; ) {
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
    return runs.map((r) => ({
      offset: r,
      len: RUN_LENGTH,
      next_coin: coins[r + RUN_LENGTH],
      next_coins: Array(RUN_LENGTH)
        .fill(0)
        .map((_, i) => coins[r + RUN_LENGTH + i])
        .filter((c) => !!c),
      type: coins[r].side,
    }));
  }

  const sum_coins = (acc, c) => acc + (c.side === 'H' ? -1 : 1);

  function render_run_list(coins, run_list) {
    return run_list
      .map(
        (r) => `
      <tr>
        <td>${render_run(RUN_LENGTH, coins, r.offset).join('')}</td>
        <td>${render_coin(r.next_coin)}</td>
        <td>${r.next_coins.map((c) => render_coin(c)).join('')}</td>
        <td>${r.next_coins.reduce(sum_coins, 0)}</td>
      </tr>
    `,
      )
      .join('');
  }

  function bindit(exported_data) {
    const to_bind = document.querySelectorAll('[data-bind]');
    for (e of to_bind) {
      const x = e.dataset.bind;
      e.innerHTML = exported_data[x];
    }
  }

  function seq_after_run(run_list, side) {
    return run_list.reduce(
      (acc, r) =>
        acc +
        r.next_coins.reduce((acc, c) => acc + (c.side === 'H' ? 1 : 0), 0),
      0,
    );
  }

  function calc_num_seq_closer_to_mean(run_list) {
    return run_list.reduce(
      (acc, r) =>
        acc +
        (Math.abs(r.next_coins.reduce(sum_coins, 0)) < RUN_LENGTH ? 1 : 0),
      0,
    );
  }

  function count_side_after_runs(run_list, side) {
    return run_list.reduce(
      (acc, r) => acc + (r.next_coin && r.next_coin.side === side ? 1 : 0),
      0,
    );
  }

  const coins = find_runs(generate_coins(NUM_COINS));
  const runs = extract_runs(coins);
  const run_list = build_run_list(coins, runs);
  const heads_run_list = run_list.filter((r) => r.type === 'H');

  const after_run_heads = count_side_after_runs(run_list, 'H');
  const after_run_tails = count_side_after_runs(run_list, 'T');
  const num_seq_closer_to_mean = calc_num_seq_closer_to_mean(run_list);

  const heads_after_run_heads = count_side_after_runs(heads_run_list, 'H');
  const heads_after_run_tails = count_side_after_runs(heads_run_list, 'T');
  const heads_num_seq_closer_to_mean =
    calc_num_seq_closer_to_mean(heads_run_list);

  const exported_data = {
    num_coins: NUM_COINS.toLocaleString(),
    coin_chart: coins.map((coin) => render_coin(coin)).join(''),
    run_chart: render_runs(coins),
    run_length: RUN_LENGTH,
    run_list: render_run_list(coins, run_list),
    after_run_heads,
    after_run_tails,
    num_runs: run_list.length,

    after_run_heads_pct: ((after_run_heads / run_list.length) * 100).toFixed(2),
    after_run_tails_pct: ((after_run_tails / run_list.length) * 100).toFixed(2),

    seq_after_run_heads: seq_after_run(run_list, 'H'),
    seq_after_run_tails: seq_after_run(run_list, 'T'),
    num_seq_closer_to_mean,
    num_seq_closer_to_mean_pct: (
      (num_seq_closer_to_mean / run_list.length) *
      100
    ).toFixed(2),

    // TODO: we could dry this out by componentizing the run list view.
    heads_run_list: render_run_list(coins, heads_run_list),
    heads_after_run_heads: count_side_after_runs(heads_run_list, 'H'),
    heads_after_run_tails: count_side_after_runs(heads_run_list, 'T'),
    heads_num_runs: heads_run_list.length,

    heads_seq_after_run_heads: seq_after_run(heads_run_list, 'H'),
    heads_seq_after_run_tails: seq_after_run(heads_run_list, 'T'),
    heads_num_seq_closer_to_mean,

    heads_after_run_heads_pct: (
      (heads_after_run_heads / heads_run_list.length) *
      100
    ).toFixed(2),
    heads_after_run_tails_pct: (
      (heads_after_run_tails / heads_run_list.length) *
      100
    ).toFixed(2),
    heads_num_seq_closer_to_mean_pct: (
      (heads_num_seq_closer_to_mean / heads_run_list.length) *
      100
    ).toFixed(2),
  };
  bindit(exported_data);
}

window.onload = wrapper;
