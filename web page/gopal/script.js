let data = [];

d3.csv("churn_internet.csv").then(d => {

    // ✅ Convert Yes/No to 1/0
    d.forEach(row => {
        row.Churn = row.Churn === "Yes" ? 1 : 0;
    });

    // ✅ GROUP DATA BY SERVICE
    data = d3.rollups(
        d,
        v => ({
            Churn: d3.sum(v, d => d.Churn),
            "No Churn": v.length - d3.sum(v, d => d.Churn)
        }),
        d => d.InternetService
    ).map(([InternetService, values]) => ({
        InternetService,
        ...values
    }));

    updateChart("All");

    d3.select("#filter").on("change", function(){
        updateChart(this.value);
    });
});

function updateChart(selected){

    let filtered = selected === "All"
        ? data
        : data.filter(d => d.InternetService === selected);

    if(filtered.length === 0) return;

    drawChart(filtered);
    updateInsight(filtered);
    updateServiceKPI(filtered);
}

/* 🔥 DONUT CHART */
function drawChart(chartData){

    d3.select("#chart").html("");

    let totalChurn = d3.sum(chartData, d => d.Churn);
    let totalNoChurn = d3.sum(chartData, d => d["No Churn"]);
    let total = totalChurn + totalNoChurn;

    const donutData = [
        {label:"Churn", value: totalChurn},
        {label:"Retained", value: totalNoChurn}
    ];

    const width = 550;
    const height = 550;
    const radius = Math.min(width, height) / 2;

    const svg = d3.select("#chart")
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .append("g")
        .attr("transform", `translate(${width/2},${height/2})`);

    const color = d3.scaleOrdinal()
        .domain(["Churn","Retained"])
        .range(["#ef4444","#22c55e"]);

    const pie = d3.pie().value(d => d.value);

    const arc = d3.arc()
        .innerRadius(radius * 0.55)
        .outerRadius(radius);

    const arcs = svg.selectAll("arc")
        .data(pie(donutData))
        .enter()
        .append("g");

    // 🔥 TOOLTIP
    const tooltip = d3.select("body")
        .append("div")
        .attr("class","tooltip")
        .style("opacity",0);

    // 🔥 DRAW PATH
    arcs.append("path")
        .attr("fill", d => color(d.data.label))
        .on("mouseover", function(event,d){

            let percent = (d.data.value / total * 100).toFixed(1);

            tooltip.style("opacity",1)
                .html(`<b>${d.data.label}</b><br>${percent}%`)
                .style("left",(event.pageX+10)+"px")
                .style("top",(event.pageY-20)+"px");

            d3.select(this).attr("opacity",0.7);
        })
        .on("mouseout", function(){
            tooltip.style("opacity",0);
            d3.select(this).attr("opacity",1);
        })
        .transition()
        .duration(800)
        .attrTween("d", function(d){
            const i = d3.interpolate(d.startAngle, d.endAngle);
            return function(t){
                d.endAngle = i(t);
                return arc(d);
            };
        });

    // 🔥 PERCENT LABELS
    arcs.append("text")
        .attr("transform", d => `translate(${arc.centroid(d)})`)
        .attr("text-anchor","middle")
        .style("fill","white")
        .style("font-size","13px")
        .text(d => ((d.data.value / total)*100).toFixed(1)+"%");

    // 🔥 CENTER TEXT
    svg.append("text")
        .attr("text-anchor","middle")
        .attr("dy","-5")
        .style("font-size","14px")
        .style("fill","#94a3b8")
        .text("Churn Rate");

    svg.append("text")
        .attr("text-anchor","middle")
        .attr("dy","20")
        .style("font-size","22px")
        .style("fill","white")
        .text(((totalChurn / total)*100).toFixed(1)+"%");
}

/* 🔥 KPI */
function updateServiceKPI(chartData){

    // 🔥 If only one service selected
    if(chartData.length === 1){
   // show detailed insight
    } else {
   // comparison insight
  

        let service = chartData[0];

        d3.select("#kpiBox").html(`
            <div class="kpi">Service: ${service.InternetService}</div>
            <div class="kpi">Churn: ${service.Churn}</div>
            <div class="kpi">Retained: ${service["No Churn"]}</div>
        `);

        return;
    }

    // 🔥 If ALL services
    let highest = chartData.reduce((a,b)=> a.Churn > b.Churn ? a : b);
    let lowest = chartData.reduce((a,b)=> a.Churn < b.Churn ? a : b);

    d3.select("#kpiBox").html(`
        <div class="kpi">🔴 High Risk: ${highest.InternetService}</div>
        <div class="kpi">🟢 Low Risk: ${lowest.InternetService}</div>
    `);
}

/* 🔥 INSIGHT */
function updateInsight(chartData){

    if(chartData.length === 1){

        let s = chartData[0];
        let total = s.Churn + s["No Churn"];
        let churnRate = (s.Churn / total * 100).toFixed(1);

        d3.select("#insight").html(`
            <h3>Service Insight</h3><br>

            <b>${s.InternetService}</b> customers show a churn rate of 
            <b>${churnRate}%</b>.<br><br>

            This suggests that customers using this service may be 
            experiencing issues such as pricing concerns, service quality, 
            or unmet expectations.<br><br>

            📊 Total Customers: ${total}<br>
            🔴 Churn: ${s.Churn}<br>
            🟢 Retained: ${s["No Churn"]}<br><br>

            <div class="highRisk">
            ⚠ Focus retention strategies on this segment.
            </div>
        `);

        return;
    }

    // 🔥 MULTI-SERVICE COMPARISON

    let highest = chartData.reduce((a,b)=> a.Churn > b.Churn ? a : b);
    let lowest = chartData.reduce((a,b)=> a.Churn < b.Churn ? a : b);

    let totalChurn = d3.sum(chartData, d => d.Churn);
    let totalCustomers = d3.sum(chartData, d => d.Churn + d["No Churn"]);
    let overallRate = (totalChurn / totalCustomers * 100).toFixed(1);

    d3.select("#insight").html(`
        <h3>Service Comparison Insight</h3><br>

        Overall churn rate is <b>${overallRate}%</b> across all services.<br><br>

        🔴 <b>${highest.InternetService}</b> has the highest churn, 
        indicating higher dissatisfaction or expectations mismatch.<br><br>

        🟢 <b>${lowest.InternetService}</b> has the lowest churn, 
        showing stable customer retention.<br><br>

        📊 This suggests that service type significantly impacts customer behavior.<br><br>

        <div class="highRisk">
        ⚠ Priority: Improve experience for ${highest.InternetService} users.
        </div>
    `);
}