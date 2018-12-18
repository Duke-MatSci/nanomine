function [x,y] = factor_plot(freq, Ep, Epp, b1,b2, shift)
[~,location] = max(Epp./Ep);
for i = 1 : length(freq)
    f = log10(freq) - shift;
end
a1=[];
a2=[];
for i = 1:location
    a1 = [a1 (f(i)-f(location))*b1+f(location)];
end
for i = location+1 : length(f)
    a2 = [a2 (f(i)-f(location))*b1+f(location)];
end

x = [a1 a2];
length(x)
y = Epp./Ep;



end