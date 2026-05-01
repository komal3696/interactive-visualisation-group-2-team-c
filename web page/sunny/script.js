const margin = {top: 40, right: 30, bottom: 70, left: 70},
      width = 520 - margin.left - margin.right,
      height = 420 - margin.top - margin.bottom;

const svg = d3.select("#chart")
  .append("svg")
  .attr("width", width + margin.left + margin.right)
  .attr("height", height + margin.top + margin.bottom);

const g = svg.append("g")
  .attr("transform", `translate(${margin.left},${margin.top})`);

const x = d3.scaleBand().range([0, width]).padding(0.4);
const y = d3.scaleLinear().range([height, 0]);

const color = d3.scaleOrdinal()
    .domain(["Stayed", "Churned"])
    .range(["#22c55e", "#d21111"]);

const formatGBP = new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP'
});

let selectedGroup = null;

d3.csv("monthly_charges_dataset.csv").then(data => {

    data.forEach(d => d.MonthlyCharges = +d.MonthlyCharges);

    const groups = ["Stayed", "Churned"];
    x.domain(groups);

    g.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x));

    const yAxis = g.append("g");

    function update(selectedContract) {

        let filtered = selectedContract === "All"
            ? data
            : data.filter(d => d.Contract === selectedContract);

        const total = filtered.length;
        const avg = d3.mean(filtered, d => d.MonthlyCharges);
        const churnRate = (filtered.filter(d => d.Churn === "Yes").length / total) * 100;

        document.getElementById("totalCustomers").innerText = total;
        document.getElementById("avgCharges").innerText = formatGBP.format(avg);
        document.getElementById("churnRate").innerText = churnRate.toFixed(1) + "%";

        const grouped = groups.map(group => {

            const values = filtered
                .filter(d => (group === "Stayed" ? d.Churn === "No" : d.Churn === "Yes"))
                .map(d => d.MonthlyCharges)
                .sort(d3.ascending);

            return {
                group,
                min: d3.min(values),
                q1: d3.quantile(values, 0.25),
                median: d3.quantile(values, 0.5),
                q3: d3.quantile(values, 0.75),
                max: d3.max(values)
            };
        });

        y.domain([0, d3.max(filtered, d => d.MonthlyCharges)]).nice();
        yAxis.transition().duration(700).call(d3.axisLeft(y));

        const boxes = g.selectAll(".box").data(grouped);

        const enter = boxes.enter().append("g").attr("class", "box");

        // ➜ vertical line (min → max)
        enter.append("line");

        // ➜ box (Q1–Q3)
        enter.append("rect");

        // ➜ median line
        enter.append("line");

        const merged = enter.merge(boxes);

        // vertical line
        merged.select("line:first-child")
            .transition()
            .duration(700)
            .attr("x1", d => x(d.group) + x.bandwidth()/2)
            .attr("x2", d => x(d.group) + x.bandwidth()/2)
            .attr("y1", d => y(d.min))
            .attr("y2", d => y(d.max))
            .attr("stroke", "#cbd5e1")
            .attr("stroke-width", 2);

        // box
        merged.select("rect")
            .transition()
            .duration(700)
            .attr("x", d => x(d.group))
            .attr("y", d => y(d.q3))
            .attr("width", x.bandwidth())
            .attr("height", d => y(d.q1) - y(d.q3))
            .attr("fill", d => color(d.group))
            .attr("opacity", d => selectedGroup && d.group !== selectedGroup ? 0.3 : 0.9)
            .attr("stroke", d => d.group === selectedGroup ? "#fff" : "none")
            .attr("stroke-width", 3)
            .style("filter", "drop-shadow(0px 0px 6px rgba(0,0,0,0.4))");

        // median line
        merged.select("line:nth-child(3)")
            .transition()
            .duration(700)
            .attr("x1", d => x(d.group))
            .attr("x2", d => x(d.group) + x.bandwidth())
            .attr("y1", d => y(d.median))
            .attr("y2", d => y(d.median))
            .attr("stroke", "#ffffff")
            .attr("stroke-width", 2);

        // CLICK interaction
        g.selectAll(".box")
            .on("click", function(event, d) {

                selectedGroup = d.group;
                update(selectedContract);

                const selectedData = filtered.filter(item =>
                    (d.group === "Stayed" && item.Churn === "No") ||
                    (d.group === "Churned" && item.Churn === "Yes")
                );

                const avg = d3.mean(selectedData, d => d.MonthlyCharges);

                document.getElementById("detailsTitle").innerText = d.group;
                document.getElementById("detailCount").innerText = selectedData.length;
                document.getElementById("detailAvg").innerText = formatGBP.format(avg);
                document.getElementById("detailMin").innerText = formatGBP.format(d.min);
                document.getElementById("detailMax").innerText = formatGBP.format(d.max);

                const contract = d3.rollup(selectedData, v => v.length, d => d.Contract);

                const list = document.getElementById("contractList");
                list.innerHTML = "";

                contract.forEach((v,k) => {
                    const li = document.createElement("li");
                    li.textContent = `${k}: ${v}`;
                    list.appendChild(li);
                });

            });

        boxes.exit().remove();
    }

    update("All");

    d3.select("#contractFilter").on("change", function() {
        update(this.value);
        selectedGroup = null;
    });

});