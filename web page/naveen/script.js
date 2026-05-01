d3.csv("churn_contract.csv").then(data => {

    data.forEach(d => {
        d.Churn = d.Churn === "Yes" ? 1 : 0;
    });

    window.fullData = data;

    createFilter(data);
    updateDashboard(data);
});

//////////////////////////////////////////////////////
// FILTER
//////////////////////////////////////////////////////

function createFilter(data){

    const contracts = ["All", ...new Set(data.map(d=>d.Contract))];

    const select = d3.select(".chartBox")
        .insert("select", "#chart")
        .style("margin-bottom","10px")
        .style("padding","6px")
        .style("border-radius","6px");

    select.selectAll("option")
        .data(contracts)
        .enter()
        .append("option")
        .text(d=>d);

    select.on("change", function(){
        const val = this.value;

        const filtered = val === "All"
            ? fullData
            : fullData.filter(d=>d.Contract === val);

        updateDashboard(filtered);
    });
}

//////////////////////////////////////////////////////
// UPDATE DASHBOARD
//////////////////////////////////////////////////////

function updateDashboard(data){

    let grouped = d3.rollups(
        data,
        v => d3.mean(v, d => d.Churn),
        d => d.Contract
    ).map(d => ({contract: d[0], value: d[1]}));

    // 🔥 SORTING (NEW)
    grouped.sort((a,b)=>b.value-a.value);

    d3.select("#chart").html("");

    drawChart(grouped);

    const highest = grouped[0];

    d3.select("#insight").html(`
        <b>Key Insight</b><br><br>
        <b>${highest.contract}</b> customers show the highest churn 
        (${(highest.value*100).toFixed(1)}%). 
        This indicates weaker customer commitment in shorter contracts.
    `);

    // 🔥 RISK BADGE (NEW)
    d3.select("#insight")
        .append("div")
        .style("margin-top","10px")
        .style("font-weight","bold")
        .style("color", highest.value > 0.3 ? "#dc2626" : "#16a34a")
        .text(highest.value > 0.3 ? "⚠ High Risk Segment" : "✓ Stable Segment");

    // 🔥 SUBHEADING (NEW)
    d3.select(".chartBox h2")
        .html("Churn Rate by Contract Type")
        .append("div")
        .style("font-size","14px")
        .style("color","#94a3b8")
        .style("margin-top","5px")
        .text("Short-term contracts show significantly higher churn behavior");
}

//////////////////////////////////////////////////////
// CHART
//////////////////////////////////////////////////////

function drawChart(data){

    const width = 750;
    const height = 420;

    const svg = d3.select("#chart")
        .append("svg")
        .attr("width", width)
        .attr("height", height);

    const tooltip = d3.select("body")
        .append("div")
        .style("position","absolute")
        .style("background","#0b1a33")
        .style("padding","8px 12px")
        .style("border-radius","6px")
        .style("color","white")
        .style("font-size","12px")
        .style("pointer-events","none")
        .style("opacity",0);

    const y = d3.scaleBand()
        .domain(data.map(d=>d.contract))
        .range([60, height-60])
        .padding(0.4);

    const x = d3.scaleLinear()
        .domain([0,1])
        .range([140, width-40]);

    //////////////////////////////////////////////////////
    // BARS
    //////////////////////////////////////////////////////

    const bars = svg.selectAll("rect")
        .data(data)
        .enter()
        .append("rect")
        .attr("y",d=>y(d.contract))
        .attr("height",y.bandwidth())
        .attr("x",140)
        .attr("width",0)
        .attr("fill",d => d.value > 0.3 ? "#dc2626" : "#16a34a")
        .style("cursor","pointer")

        // 🔥 HOVER GLOW (NEW)
        .on("mouseover", function(event,d){
            d3.select(this)
              .attr("opacity",0.7)
              .attr("stroke","#ffffff")
              .attr("stroke-width",2);

            tooltip
                .style("opacity",1)
                .html(`
                    <b>${d.contract}</b><br>
                    Churn: ${(d.value*100).toFixed(1)}%
                `);
        })
        .on("mousemove", function(event){
            tooltip
                .style("left",(event.pageX + 10) + "px")
                .style("top",(event.pageY - 20) + "px");
        })
        .on("mouseout", function(){
            d3.select(this)
              .attr("opacity",1)
              .attr("stroke","none");

            tooltip.style("opacity",0);
        });

    // Animation
    bars.transition()
        .duration(1000)
        .attr("width",d=>x(d.value)-140);

    //////////////////////////////////////////////////////
    // LABELS
    //////////////////////////////////////////////////////

    svg.selectAll(".bar-label")
        .data(data)
        .enter()
        .append("text")
        .attr("x",d=>x(d.value)+5)
        .attr("y",d=>y(d.contract)+y.bandwidth()/2+5)
        .text(d => (d.value*100).toFixed(1)+"%")
        .style("fill","white")
        .style("font-size","13px");

    //////////////////////////////////////////////////////
    // AXES
    //////////////////////////////////////////////////////

    svg.append("g")
        .attr("transform","translate(140,0)")
        .call(d3.axisLeft(y));

    svg.append("g")
        .attr("transform",`translate(0,${height-60})`)
        .call(d3.axisBottom(x).tickFormat(d3.format(".0%")));

    //////////////////////////////////////////////////////
    // AXIS LABELS
    //////////////////////////////////////////////////////

    svg.append("text")
        .attr("x", width/2)
        .attr("y", height-15)
        .attr("text-anchor","middle")
        .text("Churn Rate")
        .style("fill","white");

    svg.append("text")
        .attr("transform","rotate(-90)")
        .attr("x",-height/2)
        .attr("y",20)
        .attr("text-anchor","middle")
        .text("Contract Type")
        .style("fill","white");
}