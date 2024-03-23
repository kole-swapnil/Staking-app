import React from "react";

export function StakingForm({ stakeTokens, withDraw, tokenSymbol }) {
  return (
    <div>
      <h4>Stake More Tokens</h4>
      <form
        onSubmit={(event) => {
          // This function just calls the transferTokens callback with the
          // form's data.
          event.preventDefault();
          const typeSubmit = event.nativeEvent.submitter.className;
          console.log('>>>>', typeSubmit);
          const formData = new FormData(event.target);
          const amount = formData.get("amount");

          if (amount) {
            let i = typeSubmit.includes('1')? 1 : 2;
            switch(i) {
              case 1: stakeTokens(amount);
                      break;
              case 2: withDraw(amount);
                      break;
              default: stakeTokens(amount);
            }
            
          }
        }}
      >
        <div className="form-group">
          <label>Amount of {tokenSymbol}</label>
          <input
            className="form-control"
            type="number"
            step="0.00000001"
            name="amount"
            placeholder="1"
            required
          />
        </div>
        <div className="form-group">
          <input className="btn btn-primary submit1" id="submit1" type="submit" value="Stake" />{"   "}
          <input className="btn btn-primary submit2" id="submit2" type="submit" value="Withdraw"/>{"   "}
        </div>
      </form>
    </div>
  );
}
